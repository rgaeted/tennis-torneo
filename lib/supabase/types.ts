// Auto-generated types from Supabase schema.
// Run: npx supabase gen types typescript --linked > lib/supabase/types.ts
// to regenerate after linking your Supabase project.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      jugador: {
        Row: {
          id: string
          nombre: string
          apellido: string
          telefono: string | null
          categoria_habitual: Database["public"]["Enums"]["categoria_tipo"] | null
          es_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          nombre: string
          apellido: string
          telefono?: string | null
          categoria_habitual?: Database["public"]["Enums"]["categoria_tipo"] | null
          es_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          telefono?: string | null
          categoria_habitual?: Database["public"]["Enums"]["categoria_tipo"] | null
          es_admin?: boolean
          created_at?: string
        }
        Relationships: []
      }
      torneo: {
        Row: {
          id: string
          nombre: string
          edicion: number
          anio: number
          fecha_inicio: string
          fecha_fin: string
          estado: Database["public"]["Enums"]["estado_torneo"]
          monto_inscripcion: number
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          edicion: number
          anio: number
          fecha_inicio: string
          fecha_fin: string
          estado?: Database["public"]["Enums"]["estado_torneo"]
          monto_inscripcion: number
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          edicion?: number
          anio?: number
          fecha_inicio?: string
          fecha_fin?: string
          estado?: Database["public"]["Enums"]["estado_torneo"]
          monto_inscripcion?: number
          created_at?: string
        }
        Relationships: []
      }
      inscripcion: {
        Row: {
          id: string
          torneo_id: string
          jugador_id: string
          categoria: Database["public"]["Enums"]["categoria_tipo"]
          es_doble: boolean
          companero_id: string | null
          estado_pago: Database["public"]["Enums"]["estado_pago"]
          monto: number
          mercadopago_payment_id: string | null
          mercadopago_preference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          torneo_id: string
          jugador_id: string
          categoria: Database["public"]["Enums"]["categoria_tipo"]
          es_doble?: boolean
          companero_id?: string | null
          estado_pago?: Database["public"]["Enums"]["estado_pago"]
          monto: number
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          torneo_id?: string
          jugador_id?: string
          categoria?: Database["public"]["Enums"]["categoria_tipo"]
          es_doble?: boolean
          companero_id?: string | null
          estado_pago?: Database["public"]["Enums"]["estado_pago"]
          monto?: number
          mercadopago_payment_id?: string | null
          mercadopago_preference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cuadro: {
        Row: {
          id: string
          torneo_id: string
          categoria: Database["public"]["Enums"]["categoria_tipo"]
          tamano: Database["public"]["Enums"]["tamano_bracket"]
          generado_en: string
        }
        Insert: {
          id?: string
          torneo_id: string
          categoria: Database["public"]["Enums"]["categoria_tipo"]
          tamano?: Database["public"]["Enums"]["tamano_bracket"]
          generado_en?: string
        }
        Update: {
          id?: string
          torneo_id?: string
          categoria?: Database["public"]["Enums"]["categoria_tipo"]
          tamano?: Database["public"]["Enums"]["tamano_bracket"]
          generado_en?: string
        }
        Relationships: []
      }
      partido: {
        Row: {
          id: string
          cuadro_id: string
          ronda: Database["public"]["Enums"]["ronda_tipo"]
          posicion: number
          jugador1_id: string | null
          jugador2_id: string | null
          ganador_id: string | null
          resultado: Json | null
          cancha: string | null
          hora_inicio: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cuadro_id: string
          ronda: Database["public"]["Enums"]["ronda_tipo"]
          posicion: number
          jugador1_id?: string | null
          jugador2_id?: string | null
          ganador_id?: string | null
          resultado?: Json | null
          cancha?: string | null
          hora_inicio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cuadro_id?: string
          ronda?: Database["public"]["Enums"]["ronda_tipo"]
          posicion?: number
          jugador1_id?: string | null
          jugador2_id?: string | null
          ganador_id?: string | null
          resultado?: Json | null
          cancha?: string | null
          hora_inicio?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      estado_torneo: "borrador" | "activo" | "cerrado"
      categoria_tipo: "cuarta" | "tercera" | "segunda" | "primera" | "damas" | "dobles"
      estado_pago: "pendiente" | "pagado" | "rechazado"
      ronda_tipo: "primera_ronda" | "segunda_ronda" | "cuartos" | "semis" | "final"
      tamano_bracket: "16" | "32"
    }
    CompositeTypes: {}
  }
}
