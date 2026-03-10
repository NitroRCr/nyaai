export type Writable<T> = {
  -readonly [P in keyof T]: T[P]
}

export interface SettingsScope {
  label: string
  to: any
}

type MetaProps = {
  title: string
  description?: string
}
type StringSchema = {
  type: 'string'
  format?: 'email' | 'password' | 'url'
  placeholder?: string
  width?: string
} & MetaProps
type NumberSchema = {
  type: 'number'
  placeholder?: string
} & MetaProps
type BooleanSchema = {
  type: 'boolean'
} & MetaProps
type EnumSchema = {
  type: 'enum'
  options: string[]
  placeholder?: string
} & MetaProps

export type TypeSchema = StringSchema | NumberSchema | BooleanSchema | EnumSchema
export type ObjectSchema = Record<string, TypeSchema>

type SchemaPrimitive<T extends TypeSchema> =
  T extends { type: 'string' } ? string :
    T extends { type: 'number' } ? number :
      T extends { type: 'boolean' } ? boolean :
        T extends { type: 'enum', options: infer O } ? O extends string[] ? O[number] : never :
          never

export type InferSchema<S> =
  S extends ObjectSchema ? Partial<{ [K in keyof S]: InferSchema<S[K]> }> :
    S extends TypeSchema ? SchemaPrimitive<S> :
      never

export type LayoutPosition = 'full' | 'left' | 'right'

export interface ShortcutKey {
  key: string
  withCtrl?: boolean
  withShift?: boolean
  withAlt?: boolean
  withMeta?: boolean
}
