declare module 'sm-crypto' {
  export const sm4: {
    encrypt(input: string | number[], key: string | number[], options?: {
      padding?: 'pkcs#5' | 'pkcs#7'
      mode?: 'cbc'
      iv?: string | number[]
      output?: 'string' | 'array'
    }): string | number[]
    decrypt(input: string | number[], key: string | number[], options?: {
      padding?: 'pkcs#5' | 'pkcs#7'
      mode?: 'cbc'
      iv?: string | number[]
      output?: 'string' | 'array'
    }): string | number[]
  }
}