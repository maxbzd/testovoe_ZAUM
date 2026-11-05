import type { AppController } from '../hooks/useAppController';
import { CommandPalette } from './CommandPalette';
import { Drawer } from './Drawer';
import { FilterSheet } from './FilterSheet';
import { Toast } from './Toast';

/** Всё, что выезжает поверх страницы: карточка, фильтры, палитра, уведомление. */
export function Overlays({ app }: { app: AppController }) {
  const { drawer, sheet, palette, state } = app;
  return (
    <>
      {drawer.item && (
        <Drawer
          item={drawer.item}
          closing={drawer.closing}
          suspended={drawer.suspended}
          position={drawer.position}
          onClose={drawer.onClose}
          onStep={drawer.onStep}
          onCopy={drawer.onCopy}
        />
      )}

      <FilterSheet
        open={sheet.open}
        platforms={state.filters.platforms}
        platformCounts={app.platformCounts}
        onTogglePlatform={(platform) => app.togglePlatform(platform, false)}
        sort={state.sort}
        onSort={(sort) => app.setSort(sort, false)}
        shown={app.rows.length}
        hasFilters={app.filtersActive}
        onReset={() => app.resetFilters(false)}
        onClose={sheet.onClose}
      />

      <CommandPalette
        open={palette.open}
        placements={app.placements}
        actions={palette.actions}
        onOpenPlacement={app.openPlacement}
        onClose={palette.onClose}
      />

      <Toast message={app.toast} />
    </>
  );
}
