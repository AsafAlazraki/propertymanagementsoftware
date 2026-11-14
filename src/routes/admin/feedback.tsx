import { createFileRoute } from '@tanstack/react-router'
import { Feedback, feedbackSearch } from '@/screens/admin/Feedback'

export const Route = createFileRoute('/admin/feedback')({ validateSearch: feedbackSearch, component: Feedback })
