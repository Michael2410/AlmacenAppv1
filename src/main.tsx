import { createRoot } from 'react-dom/client'
import './index.css'
import 'antd/dist/reset.css'
import { RouterProvider } from 'react-router-dom'
import router from './app/router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
)
