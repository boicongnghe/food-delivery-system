import { createPortal } from 'react-dom'

/**
 * Renders `children` outside the app root so ONLY they are printed (see the print rules in index.css).
 * Hidden on screen. Usage: render it, then call window.print().
 */
export default function PrintPortal({ children }) {
  return createPortal(<div className="print-only">{children}</div>, document.body)
}
