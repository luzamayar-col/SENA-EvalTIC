import { Header } from "@/components/organisms/Header";
import { Footer } from "@/components/organisms/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col w-full bg-sena-gray-light/30">
        {children}
      </main>
      <Footer />
    </>
  );
}
