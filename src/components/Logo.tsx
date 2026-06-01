/**
 * The Swipe Safe brand logo, served from /public/logo.svg.
 *
 * Height-constrained by default (`h-8 w-auto`) so it scales cleanly in headers
 * while preserving the file's own aspect ratio. Pass `className` to resize.
 *
 * Uses a plain <img> rather than next/image so the SVG renders as-is without
 * the image optimizer (no next.config changes needed).
 */
export function Logo({
  className = 'h-8 w-auto',
  alt = 'Swipe Safe',
}: {
  className?: string;
  alt?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt={alt} className={className} />;
}

export default Logo;
