export default function AdminFieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-red-400">{message}</p> : null
}
