import { createFileRoute } from '@tanstack/react-router'
import { Feedback } from '@/screens/admin/Feedback'
import { feedbackSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/feedback')({ validateSearch: feedbackSearch, component: Feedback })
