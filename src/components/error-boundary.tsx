"use client"

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">
                Une erreur est survenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Erreur inattendue</AlertTitle>
                <AlertDescription>
                  L&apos;application a rencontré une erreur inattendue. 
                  Veuillez recharger la page ou contacter le support si le problème persiste.
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
                  <strong>Détails de l&apos;erreur:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={this.resetError}
                  variant="outline"
                  className="flex-1"
                >
                  Réessayer
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Recharger la page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }