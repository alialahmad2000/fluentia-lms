export default function TrainerMobileBar() {
  return (
    <nav
      data-role="mobile-bottom-nav"
      aria-label="التنقل الرئيسي — المدرب"
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'var(--tr-glass, rgba(20,20,20,0.88))',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid var(--tr-border, rgba(245,158,11,0.12))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 64,
      }}
    >
      {/* Nav items populated in T2 */}
    </nav>
  )
}
