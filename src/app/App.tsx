import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { UexProvider } from "@/app/UexProvider";

export function App() {
  return (
    <AppProviders>
      <UexProvider>
        <RouterProvider router={router} />
      </UexProvider>
    </AppProviders>
  );
}
