import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow same-origin relative redirects (no open-redirect via ?next=).
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/admin/dashboard'
  }
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  // Supabase can redirect back with its own error (e.g. otp_expired,
  // access_denied) and NO code. Forward that reason verbatim.
  const providerError =
    searchParams.get('error_code') ||
    searchParams.get('error') ||
    searchParams.get('error_description')

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // Exchange failed. The single most common cause is a CONSUMED code:
    // the link was clicked twice, the callback tab was refreshed, or an
    // email security scanner pre-fetched the URL. If the first hit already
    // established a session, self-heal instead of bouncing the user.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error(
      'Auth exchange failed:',
      error.code ?? error.status,
      error.message
    )
    const reason = encodeURIComponent(error.code ?? error.message).slice(0, 120)
    return NextResponse.redirect(
      `${origin}/admin/login?error=auth_failed&reason=${reason}`
    )
  }

  // No code. Either Supabase returned an explicit error, or the user
  // already has a valid session (e.g. clicked a stale link after a prior
  // successful login) — in which case just send them through.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const reason = encodeURIComponent(providerError ?? 'no_code').slice(0, 120)
  console.error('Auth callback without usable code. reason:', reason)
  return NextResponse.redirect(
    `${origin}/admin/login?error=auth_failed&reason=${reason}`
  )
}
