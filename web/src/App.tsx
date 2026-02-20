import { DeviceProvider } from './context/DeviceContext.tsx';
import AppShell from './components/AppShell.tsx';

export default function App() {
  return (
    <DeviceProvider>
      <AppShell />
    </DeviceProvider>
  );
}
