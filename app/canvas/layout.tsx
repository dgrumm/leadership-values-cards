import { SessionHeader } from '@/components/header/SessionHeader';

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <SessionHeader />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}