import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur-sm">
      <div className="container flex flex-col gap-8 px-4 py-10 md:px-6 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold">
              <div className="relative h-4 w-[120px]">
                <Image
                  src="/logo.svg"
                  alt="Deinspar Logo"
                  fill
                  className="object-contain"
                  priority
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = '<span class="font-bold">DEINSPAR</span>'
                    }
                  }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Collaborate with Artists. Grow together.</p>
            <div className="flex gap-3">
              <Link
                href="https://www.pinterest.com/deinsparcom"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  fill="currentColor"
                  width="17.5"
                  height="17.5"
                  viewBox="0 0 32 32"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>pinterest</title>
                  <path d="M16.021 1.004c-0 0-0.001 0-0.002 0-8.273 0-14.979 6.706-14.979 14.979 0 6.308 3.899 11.705 9.419 13.913l0.101 0.036c-0.087-0.595-0.137-1.281-0.137-1.979 0-0.819 0.068-1.622 0.2-2.403l-0.012 0.084c0.274-1.171 1.757-7.444 1.757-7.444-0.284-0.636-0.449-1.379-0.449-2.16 0-0.023 0-0.046 0-0.069l-0 0.004c0-2.078 1.208-3.638 2.709-3.638 0.008-0 0.018-0 0.028-0 1.040 0 1.883 0.843 1.883 1.883 0 0.080-0.005 0.159-0.015 0.236l0.001-0.009c-0.307 1.903-0.738 3.583-1.304 5.199l0.064-0.21c-0.042 0.161-0.067 0.345-0.067 0.535 0 1.2 0.973 2.173 2.173 2.173 0.039 0 0.078-0.001 0.117-0.003l-0.005 0c2.659 0 4.709-2.805 4.709-6.857 0.002-0.054 0.003-0.118 0.003-0.182 0-3.265-2.647-5.913-5.913-5.913-0.123 0-0.244 0.004-0.365 0.011l0.017-0.001c-0.083-0.004-0.18-0.006-0.277-0.006-3.58 0-6.482 2.902-6.482 6.482 0 0.007 0 0.014 0 0.022v-0.001c0 0 0 0.001 0 0.001 0 1.287 0.417 2.476 1.122 3.441l-0.011-0.016c0.076 0.081 0.122 0.191 0.122 0.311 0 0.043-0.006 0.084-0.017 0.123l0.001-0.003c-0.112 0.469-0.366 1.498-0.417 1.703-0.066 0.281-0.215 0.339-0.501 0.206-1.843-1.214-3.043-3.274-3.043-5.614 0-0.068 0.001-0.135 0.003-0.202l-0 0.010c0-4.719 3.434-9.062 9.897-9.062 0.132-0.007 0.287-0.011 0.442-0.011 4.811 0 8.72 3.862 8.795 8.655l0 0.007c0 5.167-3.258 9.325-7.789 9.325-0.039 0.001-0.086 0.002-0.132 0.002-1.366 0-2.573-0.677-3.306-1.713l-0.008-0.013-0.936 3.559c-0.488 1.499-1.123 2.8-1.91 3.992l0.038-0.061c1.325 0.425 2.85 0.671 4.432 0.671 8.274 0 14.981-6.707 14.981-14.981 0-8.272-6.705-14.978-14.977-14.981h-0z"></path>
                </svg>
                <span className="sr-only">Pinterest</span>
              </Link>
              <Link
                href="https://www.instagram.com/deinspar"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  fill="currentColor"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  data-name="Layer 1"
                >
                  <path d="M17.34,5.46h0a1.2,1.2,0,1,0,1.2,1.2A1.2,1.2,0,0,0,17.34,5.46Zm4.6,2.42a7.59,7.59,0,0,0-.46-2.43,4.94,4.94,0,0,0-1.16-1.77,4.7,4.7,0,0,0-1.77-1.15,7.3,7.3,0,0,0-2.43-.47C15.06,2,14.72,2,12,2s-3.06,0-4.12.06a7.3,7.3,0,0,0-2.43.47A4.78,4.78,0,0,0,3.68,3.68,4.7,4.7,0,0,0,2.53,5.45a7.3,7.3,0,0,0-.47,2.43C2,8.94,2,9.28,2,12s0,3.06.06,4.12a7.3,7.3,0,0,0,.47,2.43,4.7,4.7,0,0,0,1.15,1.77,4.78,4.78,0,0,0,1.77,1.15,7.3,7.3,0,0,0,2.43.47C8.94,22,9.28,22,12,22s3.06,0,4.12-.06a7.3,7.3,0,0,0,2.43-.47,4.7,4.7,0,0,0,1.77-1.15,4.85,4.85,0,0,0,1.16-1.77,7.59,7.59,0,0,0,.46-2.43c0-1.06.06-1.4.06-4.12S22,8.94,21.94,7.88ZM20.14,16a5.61,5.61,0,0,1-.34,1.86,3.06,3.06,0,0,1-.75,1.15,3.19,3.19,0,0,1-1.15.75,5.61,5.61,0,0,1-1.86.34c-1,.05-1.37.06-4,.06s-3,0-4-.06A5.73,5.73,0,0,1,6.1,19.8,3.27,3.27,0,0,1,5,19.05a3,3,0,0,1-.74-1.15A5.54,5.54,0,0,1,3.86,16c0-1-.06-1.37-.06-4s0-3,.06-4A5.54,5.54,0,0,1,4.21,6.1,3,3,0,0,1,5,5,3.14,3.14,0,0,1,6.1,4.2,5.73,5.73,0,0,1,8,3.86c1,0,1.37-.06,4-.06s3,0,4,.06a5.61,5.61,0,0,1,1.86.34A3.06,3.06,0,0,1,19.05,5,3.06,3.06,0,0,1,19.8,6.1,5.61,5.61,0,0,1,20.14,8c.05,1,.06,1.37.06,4S20.19,15,20.14,16ZM12,6.87A5.13,5.13,0,1,0,17.14,12,5.12,5.12,0,0,0,12,6.87Zm0,8.46A3.33,3.33,0,1,1,15.33,12,3.33,3.33,0,0,1,12,15.33Z" />
                </svg>
                <span className="sr-only">Instagram</span>
              </Link>
              <Link
                href="https://www.linkedin.com/company/deinspar"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  fill="currentColor"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  data-name="Layer 1"
                >
                  <path d="M20.47,2H3.53A1.45,1.45,0,0,0,2.06,3.43V20.57A1.45,1.45,0,0,0,3.53,22H20.47a1.45,1.45,0,0,0,1.47-1.43V3.43A1.45,1.45,0,0,0,20.47,2ZM8.09,18.74h-3v-9h3ZM6.59,8.48h0a1.56,1.56,0,1,1,0-3.12,1.57,1.57,0,1,1,0,3.12ZM18.91,18.74h-3V13.91c0-1.21-.43-2-1.52-2A1.65,1.65,0,0,0,12.85,13a2,2,0,0,0-.1.73v5h-3s0-8.18,0-9h3V11A3,3,0,0,1,15.46,9.5c2,0,3.45,1.29,3.45,4.06Z" />
                </svg>
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold">For Creators</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Become a Creator
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Commission & Earnings
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/admin-portal" className="text-muted-foreground hover:text-foreground transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-bold">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  b2b@deinspar.com
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row justify-between items-center border-t border-border/40 pt-8">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Deinspar Limited. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy-policy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/cookie-policy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
