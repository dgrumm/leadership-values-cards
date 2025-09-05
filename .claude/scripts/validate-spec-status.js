// .claude/scripts/validate-spec-status.js
const fs = require('fs');
const glob = require('glob');

function validateSpecStatus() {
    const issues = [];
    const correctSpecs = { '🟢': [], '🟡': [], '🔴': [] };
    const allSpecs = [];
    
    // Check 1: All specs have required metadata
    const specFiles = glob.sync('specs/**/*.md').filter(file => 
        !file.includes('/status.md') && // Exclude rollup status files
        !file.includes('README.md')    // Exclude documentation files
    );
    
    specFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const specName = getSpecDisplayName(file);
        
        // Basic validation issues
        if (!hasAcceptanceCriteria(content)) {
            issues.push(`❌ ${file}: Missing acceptance criteria checkboxes`);
        }
        
        if (!hasStatusSection(content)) {
            issues.push(`⚠️ ${file}: Missing status section`);
        }
        
        // Calculate actual status based on checkboxes
        const checkboxes = extractCheckboxes(content);
        const orphanedStatus = getOrphanedCheckboxStatus(content);
        const declaredStatus = extractDeclaredStatus(content);
        const calculatedStatus = calculateStatusFromCheckboxes(checkboxes, orphanedStatus);
        
        // Track this spec
        allSpecs.push({
            file,
            specName,
            declaredStatus,
            calculatedStatus,
            checkboxes,
            orphanedStatus
        });
        
        // Check for status consistency
        if (declaredStatus === null) {
            issues.push(`📊 ${file}: No status declared`);
        } else if (declaredStatus !== calculatedStatus) {
            let statusMsg = `📊 ${file}: Status mismatch - declared "${declaredStatus}" but checkboxes indicate "${calculatedStatus}"`;
            
            // Add helpful context about what's influencing the calculated status
            if (orphanedStatus.checkedCount > 0) {
                statusMsg += ` (${orphanedStatus.checkedCount} checked work item${orphanedStatus.checkedCount > 1 ? 's' : ''} indicate progress)`;
            }
            
            issues.push(statusMsg);
        } else {
            // Status is correct - add to correct specs
            let displayName = specName;
            
            if (orphanedStatus.checkedCount > 0 && calculatedStatus === '🟡') {
                displayName += ` (+${orphanedStatus.checkedCount} work item${orphanedStatus.checkedCount > 1 ? 's' : ''})`;
            } else if (orphanedStatus.hasOrphaned && orphanedStatus.checkedCount === 0 && calculatedStatus === '🔴') {
                displayName += ` (${orphanedStatus.totalOrphaned} planned item${orphanedStatus.totalOrphaned > 1 ? 's' : ''})`;
            }
            
            correctSpecs[declaredStatus].push(displayName);
        }
        
        // Check for orphaned checkboxes (only warn if they seem problematic)
        if (orphanedStatus.hasOrphaned && orphanedStatus.checkedCount === 0) {
            // Only warn if status is NOT "Not Started" - if it's "Not Started", this is correct planning
            if (declaredStatus !== '🔴') {
                issues.push(`🔧 ${file}: Unchecked checkboxes outside acceptance criteria section (consider removing or moving)`);
            }
        }
    });
    
    // Check 2: Dependency validation  
    validateDependencies(specFiles, issues);
    
    // Check 3: Status logic validation
    validateStatusLogic(specFiles, issues);
    
    return { issues, correctSpecs, allSpecs };
}

function validateDependencies(specFiles, issues) {
    const specIds = extractAllSpecIds(specFiles);
    
    specFiles.forEach(file => {
        const dependencies = extractDependencies(file);
        dependencies.forEach(dep => {
            if (!specIds.includes(dep)) {
                issues.push(`🔗 ${file}: References non-existent dependency "${dep}"`);
            }
        });
    });
}

function validateStatusLogic(specFiles, issues) {
    specFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const checkboxes = extractCheckboxes(content);
        const orphanedStatus = getOrphanedCheckboxStatus(content);
        const declaredStatus = extractDeclaredStatus(content);
        const calculatedStatus = calculateStatusFromCheckboxes(checkboxes, orphanedStatus);
        
        if (declaredStatus !== calculatedStatus && declaredStatus !== null) {
            let statusMsg = `📊 ${file}: Status mismatch - declared "${declaredStatus}" but checkboxes indicate "${calculatedStatus}"`;
            
            // Add helpful context about orphaned checkboxes influencing status
            if (orphanedStatus.checkedCount > 0 && calculatedStatus === '🟡') {
                statusMsg += ` (${orphanedStatus.checkedCount} checked orphaned checkbox${orphanedStatus.checkedCount > 1 ? 'es' : ''} indicate progress)`;
            }
            
            issues.push(statusMsg);
        }
    });
}

// Helper functions
function hasAcceptanceCriteria(content) {
    return /## Acceptance Criteria/i.test(content) && /- \[([ x])\]/g.test(content);
}

function hasStatusSection(content) {
    return /## Status|\*\*Status\*\*:/i.test(content);
}

function hasOrphanedCheckboxes(content) {
    const lines = content.split('\n');
    let inAcceptanceCriteria = false;
    
    for (const line of lines) {
        if (/## Acceptance Criteria/i.test(line)) {
            inAcceptanceCriteria = true;
            continue;
        }
        if (/^##/.test(line) && inAcceptanceCriteria) {
            inAcceptanceCriteria = false;
        }
        if (!inAcceptanceCriteria && /- \[([ x])\]/.test(line)) {
            return true;
        }
    }
    return false;
}

function getOrphanedCheckboxStatus(content) {
    const lines = content.split('\n');
    let inAcceptanceCriteria = false;
    let orphanedCount = 0;
    let checkedCount = 0;
    
    for (const line of lines) {
        if (/## Acceptance Criteria/i.test(line)) {
            inAcceptanceCriteria = true;
            continue;
        }
        if (/^##/.test(line) && inAcceptanceCriteria) {
            inAcceptanceCriteria = false;
        }
        if (!inAcceptanceCriteria) {
            const checkboxMatch = line.match(/- \[([ x])\]/);
            if (checkboxMatch) {
                orphanedCount++;
                if (checkboxMatch[1] === 'x') {
                    checkedCount++;
                }
            }
        }
    }
    
    return {
        hasOrphaned: orphanedCount > 0,
        totalOrphaned: orphanedCount,
        checkedCount: checkedCount
    };
}

function extractAllSpecIds(specFiles) {
    const ids = [];
    specFiles.forEach(file => {
        const match = file.match(/(\d+\.\d+)/);
        if (match) ids.push(match[1]);
    });
    return ids;
}

function extractDependencies(file) {
    const content = fs.readFileSync(file, 'utf8');
    const dependencyRegex = /depends on (\d+\.\d+)|requires (\d+\.\d+)/gi;
    const dependencies = [];
    let match;
    
    while ((match = dependencyRegex.exec(content)) !== null) {
        dependencies.push(match[1] || match[2]);
    }
    return dependencies;
}

function extractCheckboxes(content) {
    const regex = /- \[([ x])\]/g;
    const matches = [...content.matchAll(regex)];
    return {
        total: matches.length,
        completed: matches.filter(m => m[1] === 'x').length
    };
}

function extractDeclaredStatus(content) {
    // Match both **Status**: and ## Status: patterns with emojis and text
    const statusMatch = content.match(/(?:\*\*Status\*\*|##\s*Status):\s*(🔴|🟡|🟢|Not Started|In Progress|Complete)/i);
    if (!statusMatch) return null;
    
    const status = statusMatch[1];
    if (status === '🔴' || /not started/i.test(status)) return '🔴';
    if (status === '🟡' || /in progress/i.test(status)) return '🟡';
    if (status === '🟢' || /complete/i.test(status)) return '🟢';
    return null;
}

function calculateStatusFromCheckboxes(checkboxes, orphanedStatus = null) {
    // If there are checked orphaned checkboxes, spec is at least "in progress"
    const hasOrphanedProgress = orphanedStatus && orphanedStatus.checkedCount > 0;
    
    // Base status from acceptance criteria checkboxes
    let baseStatus = '🔴'; // Not Started
    if (checkboxes.total > 0) {
        if (checkboxes.completed === 0) {
            baseStatus = '🔴'; // Not Started
        } else if (checkboxes.completed === checkboxes.total) {
            baseStatus = '🟢'; // Complete
        } else {
            baseStatus = '🟡'; // In Progress
        }
    }
    
    // If acceptance criteria shows "not started" but there are checked orphaned boxes,
    // upgrade to "in progress"
    if (baseStatus === '�' && hasOrphanedProgress) {
        return '🟡';
    }
    
    return baseStatus;
}

function getSpecDisplayName(file) {
    // Extract a clean display name from file path
    const parts = file.split('/');
    const filename = parts[parts.length - 1].replace('.md', '');
    const section = parts[parts.length - 2] || '';
    return `${section}/${filename}`;
}

function displayCorrectSpecs(correctSpecs) {
    console.log('\n📋 Specs with Correct Status:\n');
    
    if (correctSpecs['🟢'].length > 0) {
        console.log(`🟢 Complete (${correctSpecs['🟢'].length}):`);
        correctSpecs['🟢'].forEach(spec => console.log(`  ✅ ${spec}`));
        console.log('');
    }
    
    if (correctSpecs['🟡'].length > 0) {
        console.log(`🟡 In Progress (${correctSpecs['🟡'].length}):`);
        correctSpecs['🟡'].forEach(spec => console.log(`  🔄 ${spec}`));
        console.log('');
    }
    
    if (correctSpecs['🔴'].length > 0) {
        console.log(`🔴 Not Started (${correctSpecs['🔴'].length}):`);
        correctSpecs['🔴'].forEach(spec => console.log(`  📝 ${spec}`));
        console.log('');
    }
    
    const totalCorrect = correctSpecs['🟢'].length + correctSpecs['🟡'].length + correctSpecs['🔴'].length;
    if (totalCorrect === 0) {
        console.log('  (No specs have correctly declared status)\n');
    }
}

// Main execution
if (require.main === module) {
    console.log('🔍 Validating spec status consistency...\n');
    
    const { issues, correctSpecs, allSpecs } = validateSpecStatus();
    
    // Show comprehensive stats
    const totalSpecs = allSpecs.length;
    const totalCorrect = correctSpecs['🟢'].length + correctSpecs['🟡'].length + correctSpecs['🔴'].length;
    const totalWithIssues = totalSpecs - totalCorrect;
    
    console.log(`📊 **Spec Analysis Summary** (${totalSpecs} total specs):`);
    console.log(`  ✅ Correct Status: ${totalCorrect}`);
    console.log(`  ❌ Issues/Mismatches: ${totalWithIssues}`);
    console.log(`  🔧 Validation Issues: ${issues.length}\n`);
    
    // Show specs with correct status first
    displayCorrectSpecs(correctSpecs);
    
    if (issues.length === 0) {
        console.log('✅ All specs are valid and consistent!');
        process.exit(0);
    } else {
        console.log(`❌ Found ${issues.length} validation issues:\n`);
        issues.forEach(issue => console.log(`  ${issue}`));
        console.log('\n💡 Run `npm run sync-status` to auto-fix some issues');
        process.exit(1);
    }
}

module.exports = { validateSpecStatus, displayCorrectSpecs };