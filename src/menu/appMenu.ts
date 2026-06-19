import { Menu, Submenu, MenuItem } from '@tauri-apps/api/menu';
import { message as dialogMessage } from '@tauri-apps/plugin-dialog';

export type AppMenuHandlers = {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
};

async function showAboutDialog(): Promise<void> {
  try {
    await dialogMessage(
      'Rishah v0.6.3\n\nA modern drawing and diagramming application built with Tauri and TLDraw.\n\n© 2025 Rishah Team',
      { title: 'About Rishah', kind: 'info' },
    );
  } catch (error) {
    console.error('Error showing about dialog:', error);
  }
}

export async function setupAppMenu(handlers: AppMenuHandlers): Promise<void> {
  try {
    const fileSubmenu = await Submenu.new({
      text: 'File',
      items: [
        await MenuItem.new({ id: 'new', text: 'New', action: () => handlers.onNew() }),
        await MenuItem.new({ id: 'open', text: 'Open', action: () => handlers.onOpen() }),
        await MenuItem.new({ id: 'save', text: 'Save', action: () => handlers.onSave() }),
        await MenuItem.new({ id: 'save-as', text: 'Save As', action: () => handlers.onSaveAs() }),
      ],
    });

    const infoSubmenu = await Submenu.new({
      text: 'Info',
      items: [
        await MenuItem.new({ id: 'about', text: 'About', action: () => showAboutDialog() }),
      ],
    });

    const menu = await Menu.new({ items: [fileSubmenu, infoSubmenu] });
    await menu.setAsAppMenu();
  } catch (error) {
    console.error('Error initializing menu:', error);
  }
}
