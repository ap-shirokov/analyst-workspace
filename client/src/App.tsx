import { Switch, Route, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/Layout';
import SwaggerTool from '@/pages/SwaggerTool';
import JsonTool from '@/pages/JsonTool';
import UuidTool from '@/pages/UuidTool';
import DiffTool from '@/pages/DiffTool';
import SqlGenTool from '@/pages/SqlGenTool';
import OpenApiGenTool from '@/pages/OpenApiGenTool';
import UserStoryTool from '@/pages/UserStoryTool';
import AcceptanceTool from '@/pages/AcceptanceTool';
import HistoryTool from '@/pages/HistoryTool';
import NotFound from '@/pages/not-found';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={SwaggerTool} />
            <Route path="/swagger" component={SwaggerTool} />
            <Route path="/json" component={JsonTool} />
            <Route path="/uuid" component={UuidTool} />
            <Route path="/diff" component={DiffTool} />
            <Route path="/sql-gen" component={SqlGenTool} />
            <Route path="/openapi-gen" component={OpenApiGenTool} />
            <Route path="/user-story" component={UserStoryTool} />
            <Route path="/acceptance" component={AcceptanceTool} />
            <Route path="/history" component={HistoryTool} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}
