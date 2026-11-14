import { createFileRoute } from '@tanstack/react-router'
import { Listing } from '@/screens/pool/Listing'

export const Route = createFileRoute('/pool/listing/$id')({ component: Listing })
