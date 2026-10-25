// "Label ........ value" line in price summaries
export default function SummaryRow({ label, value }) {
  return (
    <p className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </p>
  )
}
