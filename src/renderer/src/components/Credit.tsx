import logoUrl from '../assets/sijooyy-logo.png'

export default function Credit(): React.JSX.Element {
  return (
    <div className="credit-row">
      <img src={logoUrl} alt="sijooyy" className="credit-logo" />
      <a
        className="credit-instagram"
        href="https://instagram.com/sijooyy"
        target="_blank"
        rel="noreferrer"
        title="Instagram @sijooyy"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        @sijooyy
      </a>
    </div>
  )
}
