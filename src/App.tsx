import { DesktopShell } from './components/DesktopShell';
import { MobileShell } from './components/MobileShell';
import { Overlays } from './components/Overlays';
import { useAppController } from './hooks/useAppController';
import type { Placement } from './types';

interface Props {
  placements: readonly Placement[];
}

export default function App({ placements }: Props) {
  const app = useAppController(placements);
  return (
    <>
      <div className={app.intro ? 'app is-intro' : 'app'} inert={app.overlayOpen}>
        {app.compact ? <MobileShell app={app} /> : <DesktopShell app={app} />}
      </div>
      <Overlays app={app} />
    </>
  );
}
