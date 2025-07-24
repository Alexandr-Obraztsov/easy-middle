import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

// Флаг видимости окна
let isVisible = true

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    skipTaskbar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.setSkipTaskbar(true)
  mainWindow.setContentProtection(true)

  // Обработчики событий окна
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  // Предотвращаем полное закрытие приложения при закрытии окна
  mainWindow.on('close', (event) => {
    if (mainWindow && isVisible) {
      event.preventDefault()
      hideWindow()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Функции управления видимостью окна
function showWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
  }
}

function hideWindow(): void {
  if (mainWindow) {
    mainWindow.hide()
  }
}

function toggleWindow(): void {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      hideWindow()
    } else {
      showWindow()
    }
  }
}

// Регистрация глобальных горячих клавиш
function registerGlobalShortcuts(): void {
  // Ctrl+Shift+H - переключение видимости окна
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    toggleWindow()
  })

  // Ctrl+Shift+S - показать окно
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    showWindow()
  })

  // Ctrl+Shift+D - скрыть окно
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    hideWindow()
  })

  // F9 - быстрое переключение (альтернативная клавиша)
  globalShortcut.register('F9', () => {
    toggleWindow()
  })

  console.log('Зарегистрированы горячие клавиши:')
  console.log('- Ctrl+Shift+H: переключить видимость')
  console.log('- Ctrl+Shift+S: показать окно')
  console.log('- Ctrl+Shift+D: скрыть окно')
  console.log('- F9: переключить видимость')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Создаем окно
  createWindow()

  // Регистрируем горячие клавиши
  registerGlobalShortcuts()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      showWindow()
    }
  })
})

// Обработка закрытия приложения
app.on('before-quit', () => {
  isVisible = false
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Отменяем регистрацию горячих клавиш перед выходом
    globalShortcut.unregisterAll()
    app.quit()
  }
})

// Отменяем регистрацию горячих клавиш при выходе
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
