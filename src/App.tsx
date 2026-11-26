import { CookMode } from './components/CookMode';
import { RecipeBox } from './components/RecipeBox';
import { RecipeCard } from './components/RecipeCard';
import { RingingAlert, TimerTray } from './components/TimerTray';
import { useRoute } from './lib/route';
import { TimersProvider } from './lib/timers';
import { WakeLockProvider } from './lib/wakeLock';

export function App() {
  const route = useRoute();

  return (
    <WakeLockProvider>
      <TimersProvider>
        {route.kind === 'box' && <RecipeBox />}
        {route.kind === 'recipe' && <RecipeCard slug={route.slug} />}
        {route.kind === 'cook' && <CookMode slug={route.slug} step={route.step} />}
        {route.kind !== 'cook' && <TimerTray placement="floating" />}
        <RingingAlert />
      </TimersProvider>
    </WakeLockProvider>
  );
}
