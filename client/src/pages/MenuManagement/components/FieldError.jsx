export default function FieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null
}
