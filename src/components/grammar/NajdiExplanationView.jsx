import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './grammar-najdi.css'

export function NajdiExplanationView({ markdown }) {
  if (!markdown) return null

  return (
    <article dir="rtl" className="najdi-explanation">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="najdi-section-heading">{children}</h2>
          ),
          p: ({ children }) => (
            <p className="najdi-para">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="najdi-list">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="najdi-list-item">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="najdi-example-block">{children}</blockquote>
          ),
          // Override pre to pass through — code component handles both inline/block
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            // Code blocks have a language-xxx className; inline code does not
            if (className) {
              return (
                <pre dir="ltr" className="najdi-code-block">
                  <code>{children}</code>
                </pre>
              )
            }
            return (
              <code dir="ltr" className="najdi-inline-code">{children}</code>
            )
          },
          strong: ({ children }) => (
            <strong className="najdi-bold" dir="auto">{children}</strong>
          ),
          hr: () => <hr className="najdi-divider" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}
