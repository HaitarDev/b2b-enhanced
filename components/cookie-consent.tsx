"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type ConsentOptions = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

type ConsentStatus = "pending" | "accepted" | "denied" | "customized"

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending")
  const [consentOptions, setConsentOptions] = useState<ConsentOptions>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const savedConsent = localStorage.getItem("cookieConsent")
    const savedOptions = localStorage.getItem("cookieConsentOptions")

    if (savedConsent) {
      setConsentStatus(savedConsent as ConsentStatus)
      if (savedOptions) {
        setConsentOptions(JSON.parse(savedOptions))
      }
    } else {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    }
    setConsentOptions(allAccepted)
    setConsentStatus("accepted")
    localStorage.setItem("cookieConsent", "accepted")
    localStorage.setItem("cookieConsentOptions", JSON.stringify(allAccepted))
    setOpen(false)
  }

  const handleDeny = () => {
    const allDenied = {
      necessary: true, // Always required
      analytics: false,
      marketing: false,
    }
    setConsentOptions(allDenied)
    setConsentStatus("denied")
    localStorage.setItem("cookieConsent", "denied")
    localStorage.setItem("cookieConsentOptions", JSON.stringify(allDenied))
    setOpen(false)
  }

  const handleSavePreferences = () => {
    setConsentStatus("customized")
    localStorage.setItem("cookieConsent", "customized")
    localStorage.setItem("cookieConsentOptions", JSON.stringify(consentOptions))
    setShowSettings(false)
    setOpen(false)
  }

  const toggleOption = (option: keyof ConsentOptions) => {
    if (option === "necessary") return // Cannot toggle necessary cookies
    setConsentOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  const openConsentManager = () => {
    setShowSettings(true)
  }

  if (!open) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="relative rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
          {!showSettings ? (
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div className="flex-1 pr-4">
                <p className="text-sm text-gray-900 dark:text-gray-300">
                  We use cookies to ensure site functionality and improve your experience. You can manage your preferences anytime.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  size="lg"
                  className="rounded-full h-8 px-4 bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={handleDeny}
                >
                  Deny
                </Button>
                <Button
                  size="lg"
                  className="rounded-full h-8 px-4 bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={handleAcceptAll}
                >
                  Accept all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 px-4 bg-transparent border border-gray-200 text-muted-foreground hover:text-foreground dark:border-gray-700"
                  onClick={openConsentManager}
                >
                  Consent Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Cookie Preferences</h3>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Necessary Cookies</h4>
                      <p className="text-xs text-gray-900 dark:text-gray-300">
                        These cookies are required for the website to function and cannot be disabled.
                      </p>
                    </div>
                    <div className="flex h-6 items-center">
                      <input
                        type="checkbox"
                        checked={consentOptions.necessary}
                        disabled
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Analytics Cookies</h4>
                      <p className="text-xs text-gray-900 dark:text-gray-300">
                        These cookies allow us to count visits and traffic sources so we can measure and improve the
                        performance of our site.
                      </p>
                    </div>
                    <div className="flex h-6 items-center">
                      <input
                        type="checkbox"
                        checked={consentOptions.analytics}
                        onChange={() => toggleOption("analytics")}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Cookies</h4>
                      <p className="text-xs text-gray-900 dark:text-gray-300">
                        These cookies help us show you relevant advertisements and promotions based on your browsing
                        habits.
                      </p>
                    </div>
                    <div className="flex h-6 items-center">
                      <input
                        type="checkbox"
                        checked={consentOptions.marketing}
                        onChange={() => toggleOption("marketing")}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowSettings(false)} className="rounded-full h-9 px-5 bg-transparent border border-gray-200 text-muted-foreground hover:text-foreground dark:border-gray-700">
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSavePreferences}
                  className="rounded-full h-9 px-5 bg-black text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
