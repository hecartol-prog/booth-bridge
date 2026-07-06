declare module "@base44/sdk" {
  export interface Base44Client {
    auth: AuthModule & Record<string, unknown>;
    entities: Record<string, {
      list(sort?: string, limit?: number, pagination?: unknown): Promise<any[]>;
      filter(query: unknown, sort?: string, limit?: number, pagination?: unknown): Promise<any[]>;
      create(payload: unknown): Promise<any>;
      update(id: string, payload: unknown): Promise<any>;
      delete(id: string): Promise<void>;
      count?(query: unknown): Promise<number>;
      subscribe?(callback: (payload: unknown) => void): () => void;
    }>;
    integrations: {
      Core: {
        InvokeLLM(params: unknown): Promise<unknown>;
        ExtractDataFromUploadedFile(params: unknown): Promise<unknown>;
        UploadFile(params: { file: File }): Promise<{ file_url: string }>;
        CreateFileSignedUrl?(params: unknown): Promise<{ signed_url?: string }>;
      };
    };
    functions: {
      invoke(name: string, payload: unknown): Promise<{ data?: unknown } & Record<string, unknown>>;
    };
  }

  interface AuthModule {
    me(): Promise<unknown>;
    loginViaEmailPassword(email: string, password: string): Promise<unknown>;
    logout(redirectUrl?: string): unknown;
    register(payload: unknown): Promise<unknown>;
    resetPasswordRequest(email: string): Promise<unknown>;
    loginWithProvider(provider: string, redirectPath?: string): unknown;
    updateMe(fields: unknown): Promise<unknown>;
    redirectToLogin(returnUrl?: string): unknown;
    refresh?(): Promise<unknown>;
    updatePassword?(newPassword: string): Promise<unknown>;
    onAuthStateChange?(callback: (event: string, session: unknown) => void): () => void;
    resetPassword?(payload: { resetToken: string; newPassword: string }): Promise<unknown>;
    confirmSignUp?(email: string, otpCode: string): Promise<unknown>;
    verifyOtp?(payload: unknown, token?: string): Promise<unknown>;
    setToken?(accessToken: string): Promise<void>;
    resendOtp?(email: string): Promise<unknown>;
  }

  export function createClient(config: Record<string, unknown>): Base44Client;
}
