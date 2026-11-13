'use client'

import { Label } from '@/components/ui/label'
import { normalizeSubdomain, websiteAddress } from '@/lib/subdomain'

interface SubdomainFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  /** The selected domain, e.g. "example.com"; undefined until one is picked */
  domain?: string
}

/** Optional subdomain input with the domain as a suffix and a live preview of the full address. */
export function SubdomainField({ id, value, onChange, domain }: SubdomainFieldProps) {
  const result = domain ? normalizeSubdomain(value, domain) : null
  const error = result && !result.ok ? result.error : null

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Subdomain (opsional)</Label>
      <div
        className={`flex h-12 items-center rounded-2xl border-2 bg-cream transition focus-within:bg-white ${
          error ? 'border-st-no' : 'border-transparent focus-within:border-violet'
        }`}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="mis. blog"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={`${id}-hint`}
          className="h-full min-w-0 flex-1 bg-transparent pl-4 text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted md:text-[15px]"
        />
        {domain && (
          <span className="max-w-[60%] shrink-0 truncate pr-4 text-base font-semibold text-muted md:text-[15px]">
            .{domain}
          </span>
        )}
      </div>
      <p id={`${id}-hint`} className={`text-[13px] font-medium ${error ? 'text-st-no' : 'text-muted'}`}>
        {error
          ? error
          : !domain
            ? 'Pilih domain dulu. Kosongkan kalau website ada di domain utama.'
            : <>Alamat website: <span className="font-mono font-semibold text-ink">{websiteAddress(result?.ok ? result.value : '', domain)}</span></>}
      </p>
    </div>
  )
}
