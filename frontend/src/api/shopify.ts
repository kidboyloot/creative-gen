import axios from 'axios'
import type {
  ImagePromptSlot,
  PreviewProduct,
  ShopifyConnection,
} from '../store/multiProductStore'

export interface CollectionPreviewResponse {
  collection_id: string
  shop_domain: string
  currency: string
  products: PreviewProduct[]
}

export interface ShopifyImportStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  step: string
  done: number
  total: number
  generate_images: boolean
  translation_engine: 'google' | 'llm'
  target_locales: string[]
  error: string | null
  shop: { domain: string | null; name: string | null; currency: string }
  items: {
    id: string
    source_product_id: string
    source_title: string
    source_price: string
    source_currency: string
    source_images: { id: string; src: string; alt: string }[]
    status: string
    shopify_draft_id: string | null
    shopify_draft_url: string | null
  }[]
  variants: {
    id: string
    item_id: string
    locale: string
    translated_title: string
    translated_description: string
    translated_tags: string[]
    price: string
    currency: string
    selected_image_ids: string[]
    shopify_draft_id: string | null
    shopify_draft_url: string | null
    pushed: boolean
  }[]
  assets: {
    id: string
    shopify_item_id: string | null
    variant: number
    url: string
    file_path: string
  }[]
}

export interface PushResult {
  variant_id: string
  ok: boolean
  error?: string
  draft_id?: string
  draft_url?: string
  title?: string
  locale?: string
}

export interface ConnectPayload {
  shop_domain: string
  access_token?: string
  client_id?: string
  client_secret?: string
}

export async function connectStore(payload: ConnectPayload) {
  // Hard-cap the connect call. Backend hops through Shopify's OAuth endpoint
  // (~10s) + a shop lookup (~10s) and should always finish inside 30s. Without
  // a timeout axios waits forever, which surfaces as an infinite spinner if
  // anything upstream stalls.
  const r = await axios.post<ShopifyConnection>('/shopify/connect', payload, { timeout: 30000 })
  return r.data
}

export async function listConnections() {
  const r = await axios.get<ShopifyConnection[]>('/shopify/connections', { timeout: 15000 })
  return r.data
}

export async function deleteConnection(id: string) {
  await axios.delete(`/shopify/connections/${id}`)
}

export async function previewCollection(connection_id: string, collection_url: string) {
  const r = await axios.post<CollectionPreviewResponse>('/shopify/collection-preview', {
    connection_id,
    collection_url,
  })
  return r.data
}

export interface StartImportPayload {
  connection_id: string
  collection_url: string
  products: PreviewProduct[]
  target_locales: string[]
  translation_engine: 'google' | 'llm'
  generate_images: boolean
  image_prompts: ImagePromptSlot[]
}

export async function startImport(payload: StartImportPayload) {
  const body = {
    ...payload,
    products: payload.products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      tags: p.tags,
      images: p.images,
    })),
  }
  const r = await axios.post<{ job_id: string; status: string }>('/shopify/import', body)
  return r.data
}

export async function fetchImportStatus(job_id: string) {
  const r = await axios.get<ShopifyImportStatus>(`/shopify/import/${job_id}`)
  return r.data
}

export interface PushVariantOverride {
  variant_id: string
  translated_title?: string
  translated_description?: string
  translated_tags?: string[]
  price?: string
  currency?: string
  selected_image_ids?: string[]
}

export async function pushDrafts(job_id: string, variant_ids: string[], overrides: PushVariantOverride[]) {
  const r = await axios.post<{ count: number; created: PushResult[] }>(
    `/shopify/import/${job_id}/push`,
    { variant_ids, overrides },
  )
  return r.data
}

export async function listLanguages() {
  const r = await axios.get<{ code: string; name: string }[]>('/translate/languages')
  return r.data.filter((l) => l.code !== 'auto')
}
