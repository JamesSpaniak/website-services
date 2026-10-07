import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDto } from './types/profile';

/** One global theme preference: profile ↔ localStorage sync rules. */
const saves: string[] = [];
vi.mock('./api-client', () => ({
    updateThemePreference: (p: string) => {
        saves.push(p);
        return Promise.resolve({ theme_preference: p });
    },
}));

let authUser: UserDto | null = null;
const setUser = vi.fn();
vi.mock('./auth-context', () => ({
    useAuth: () => ({ user: authUser, setUser, isLoading: false }),
}));

const { ThemeProvider, THEME_STORAGE_KEY } = await import('./theme-context');
const { ThemeProfileSync, useChooseTheme } = await import('./theme-sync');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user = (theme_preference: UserDto['theme_preference']): UserDto => ({
    id: 1,
    username: 'pilot',
    email: 'pilot@example.com',
    role: 'user',
    theme_preference,
});

let choose: ReturnType<typeof useChooseTheme>;
function Chooser() {
    choose = useChooseTheme();
    return null;
}

let root: Root;
const mount = async () => {
    root = createRoot(document.createElement('div'));
    await act(async () =>
        root.render(
            <ThemeProvider>
                <ThemeProfileSync />
                <Chooser />
            </ThemeProvider>,
        ),
    );
};
const htmlTheme = () => document.documentElement.dataset.theme;

beforeEach(() => {
    saves.length = 0;
    authUser = null;
    localStorage.clear();
    document.documentElement.dataset.theme = 'dark';
});

afterEach(() => {
    act(() => root?.unmount());
});

describe('ThemeProfileSync', () => {
    it('applies the profile theme on sign-in, over the browser choice', async () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        authUser = user('light');
        await mount();
        expect(htmlTheme()).toBe('light');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        expect(saves).toEqual([]);
    });

    it('saves an existing browser choice when the profile has none', async () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
        authUser = user(null);
        await mount();
        expect(saves).toEqual(['light']);
        expect(htmlTheme()).toBe('light');
    });

    it('saves nothing when no theme was ever chosen', async () => {
        authUser = user(null);
        await mount();
        expect(saves).toEqual([]);
        expect(htmlTheme()).toBe('dark');
    });
});

describe('useChooseTheme', () => {
    it('saves to the profile when signed in', async () => {
        authUser = user('dark');
        await mount();
        await act(async () => choose('light'));
        expect(saves).toEqual(['light']);
        expect(htmlTheme()).toBe('light');
    });

    it('stays local when signed out', async () => {
        await mount();
        await act(async () => choose('light'));
        expect(saves).toEqual([]);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
});
