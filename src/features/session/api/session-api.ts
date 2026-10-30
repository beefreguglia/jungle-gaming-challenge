import { API_PATHS, AUTH_HEADER, bearer } from '@/domain/api-contract'
import {
  type CurrentSession,
  currentSessionSchema,
  type Session,
  sessionSchema,
  type SignInInput,
  type SignUpInput,
} from '@/domain/auth'
import type { HttpClient } from '@/shared/api'

export interface SessionApi {
  signIn(input: SignInInput): Promise<Session>
  signUp(input: SignUpInput): Promise<Session>
  current(signal?: AbortSignal): Promise<CurrentSession>
  // Takes the token explicitly: the local session is already gone when this runs
  signOut(token: string): Promise<void>
}

export function createSessionApi(http: HttpClient): SessionApi {
  return {
    signIn: (input) => http.post(API_PATHS.signIn, input, { schema: sessionSchema }),
    signUp: (input) => http.post(API_PATHS.signUp, input, { schema: sessionSchema }),
    current: (signal) => http.get(API_PATHS.session, { schema: currentSessionSchema, signal }),
    signOut: (token) =>
      http.delete<void>(API_PATHS.session, { headers: { [AUTH_HEADER]: bearer(token) } }),
  }
}
