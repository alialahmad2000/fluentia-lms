import './grammar.css'

export default function GrammarPageShell({ children }) {
  return (
    <div className="grammar-page rounded-2xl">
      <div className="relative z-[1] max-w-[920px] mx-auto px-5 sm:px-8 py-8 pb-12" dir="rtl">
        {children}
      </div>
    </div>
  )
}
