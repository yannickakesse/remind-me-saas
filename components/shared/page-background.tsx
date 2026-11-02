// Fond d'écran plein écran propre à chaque page (images dans /public/images/backgrounds).
// À placer en premier enfant d'un conteneur `relative isolate`.
export function PageBackground({ src }: { src: string }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none -z-10 transition-[background-image] duration-300"
      style={{ backgroundImage: `url('${src}')` }}
    />
  );
}
