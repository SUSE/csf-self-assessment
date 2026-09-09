import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  lstat,
  mkdir,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { PALETTES, palettePresetValues } from '../packages/platform/scripts/theme-palette-bridge.mjs';

const MARKER_NAME = '.csf-tweakcn-runtime.json';
const GENERATED_PRESETS = 'utils/csf-repository-presets.ts';
const UPSTREAM_PRESETS = 'utils/theme-presets.ts';
const UPSTREAM_NEXT_CONFIG = 'next.config.ts';
const MARKER_SCHEMA = 1;
export const GENERATOR_VERSION = 4;

export const REPOSITORY_PRESETS = Object.freeze([
  { paletteId: 'suse', presetId: 'csf-suse', label: 'CSF-SUSE' },
  { paletteId: 'pine-mint', presetId: 'csf-pine-mint', label: 'CSF-Pine & Mint' },
  { paletteId: 'fog-editorial', presetId: 'csf-fog-editorial', label: 'CSF-Fog Editorial' },
  { paletteId: 'instrument', presetId: 'csf-instrument', label: 'CSF-Instrument' },
  { paletteId: 'claymorphism', presetId: 'csf-claymorphism', label: 'CSF-Claymorphism' },
  { paletteId: 'cleanslate', presetId: 'csf-cleanslate', label: 'CSF-Cleanslate' },
  { paletteId: 'modern-minimal', presetId: 'csf-modern-minimal', label: 'CSF-Modern Minimal' },
  { paletteId: 'supabase', presetId: 'csf-supabase', label: 'CSF-Supabase' },
]);

function fail(message) {
  throw new Error(`tweakcn-runtime: ${message}`);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe', ...options });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('').trim();
    fail(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
  }
  return (result.stdout ?? '').trim();
}

function git(checkout, ...args) {
  return run('git', ['-C', checkout, ...args]);
}

function removeImport(source, text) {
  return source.replace(`${text}\n`, '');
}

function patchHeader(source) {
  let patched = source;
  patched = removeImport(patched, 'import { UserProfileDropdown } from "@/components/user-profile-dropdown";');
  patched = removeImport(patched, 'import { GetProCTA } from "./get-pro-cta";');
  patched = patched.replace(/^\s*<GetProCTA[^\n]*\/>\n/m, '');
  patched = patched.replace(/^\s*<UserProfileDropdown \/>\n/m, '');
  return patched;
}

function patchLayout(source) {
  let patched = source;
  patched = removeImport(patched, 'import { AuthDialogWrapper } from "@/components/auth-dialog-wrapper";');
  patched = removeImport(patched, 'import { GetProDialogWrapper } from "@/components/get-pro-dialog-wrapper";');
  patched = patched.replace(/^\s*<AuthDialogWrapper \/>\n/m, '');
  patched = patched.replace(/^\s*<GetProDialogWrapper \/>\n/m, '');
  return patched;
}

const LOCAL_ROOT_PAGE = `import Editor from "@/components/editor/editor";
import { Header } from "@/components/header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "tweakcn — Local Theme Editor",
  description: "Edit and export repository theme CSS with the local tweakcn runtime.",
};

export default function Home() {
  const themePromise = Promise.resolve(null);

  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden">
      <Header />
      <main className="isolate flex flex-1 flex-col overflow-hidden">
        <Editor themePromise={themePromise} />
      </main>
    </div>
  );
}
`;

const LOCAL_DIALOG_ACTIONS = `import { CodePanelDialog } from "@/components/editor/code-panel-dialog";
import CssImportDialog from "@/components/editor/css-import-dialog";
import { toast } from "@/components/ui/use-toast";
import { useEditorStore } from "@/store/editor-store";
import { parseCssInput } from "@/utils/parse-css-input";
import { createContext, ReactNode, useContext, useState } from "react";

interface DialogActionsContextType {
  cssImportOpen: boolean;
  codePanelOpen: boolean;
  setCssImportOpen: (open: boolean) => void;
  setCodePanelOpen: (open: boolean) => void;
  handleCssImport: (css: string) => void;
}

function useDialogActionsStore(): DialogActionsContextType {
  const [cssImportOpen, setCssImportOpen] = useState(false);
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const { themeState, setThemeState } = useEditorStore();

  const handleCssImport = (css: string) => {
    const { lightColors, darkColors } = parseCssInput(css);
    setThemeState({
      ...themeState,
      styles: {
        ...themeState.styles,
        light: { ...themeState.styles.light, ...lightColors },
        dark: { ...themeState.styles.dark, ...darkColors },
      },
    });
    toast({
      title: "CSS imported",
      description: "Your custom CSS has been imported successfully",
    });
  };

  return {
    cssImportOpen,
    codePanelOpen,
    setCssImportOpen,
    setCodePanelOpen,
    handleCssImport,
  };
}

export const DialogActionsContext = createContext<DialogActionsContextType | null>(null);

export function DialogActionsProvider({ children }: { children: ReactNode }) {
  const { themeState } = useEditorStore();
  const store = useDialogActionsStore();

  return (
    <DialogActionsContext value={store}>
      {children}
      <CssImportDialog
        open={store.cssImportOpen}
        onOpenChange={store.setCssImportOpen}
        onImport={store.handleCssImport}
      />
      <CodePanelDialog
        open={store.codePanelOpen}
        onOpenChange={store.setCodePanelOpen}
        themeEditorState={themeState}
      />
    </DialogActionsContext>
  );
}

export function useDialogActions(): DialogActionsContextType {
  const context = useContext(DialogActionsContext);
  if (!context) {
    throw new Error("useDialogActions must be used within a DialogActionsProvider");
  }
  return context;
}
`;

const LOCAL_ACTION_BAR = `import { ActionBarButtons } from "@/components/editor/action-bar/components/action-bar-buttons";
import { HorizontalScrollArea } from "@/components/horizontal-scroll-area";
import { useDialogActions } from "@/hooks/use-dialog-actions";

export function ActionBar() {
  const { setCssImportOpen, setCodePanelOpen } = useDialogActions();

  return (
    <div className="border-b">
      <HorizontalScrollArea className="flex h-14 w-full items-center justify-end gap-4 px-4">
        <ActionBarButtons
          onImportClick={() => setCssImportOpen(true)}
          onExportClick={() => setCodePanelOpen(true)}
        />
      </HorizontalScrollArea>
    </div>
  );
}
`;

const LOCAL_ACTION_BAR_BUTTONS = `import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/store/editor-store";
import { Download } from "lucide-react";
import { ImportButton } from "./import-button";
import { MoreOptions } from "./more-options";
import { ResetButton } from "./reset-button";
import { ThemeToggle } from "./theme-toggle";
import { UndoRedoButtons } from "./undo-redo-buttons";

interface ActionBarButtonsProps {
  onImportClick: () => void;
  onExportClick: () => void;
}

export function ActionBarButtons({ onImportClick, onExportClick }: ActionBarButtonsProps) {
  const { resetToCurrentPreset, hasUnsavedChanges } = useEditorStore();

  return (
    <div className="flex items-center gap-1">
      <MoreOptions />
      <Separator orientation="vertical" className="mx-1 h-8" />
      <ThemeToggle />
      <Separator orientation="vertical" className="mx-1 h-8" />
      <UndoRedoButtons />
      <Separator orientation="vertical" className="mx-1 h-8" />
      <ResetButton onClick={resetToCurrentPreset} disabled={!hasUnsavedChanges()} />
      <div className="hidden items-center gap-1 md:flex">
        <ImportButton onClick={onImportClick} />
      </div>
      <Separator orientation="vertical" className="mx-1 h-8" />
      <Button variant="default" size="sm" onClick={onExportClick}>
        <Download />
        Export CSS
      </Button>
    </div>
  );
}
`;

const LOCAL_CODE_PANEL = `import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { ThemeEditorState } from "@/types/editor";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
} from "@/components/ui/base-ui-tabs";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { useEditorStore } from "@/store/editor-store";
import { usePreferencesStore } from "@/store/preferences-store";
import {
  generateThemeCode,
  generateTailwindConfigCode,
  generateLayoutCode,
} from "@/utils/theme-style-generator";
import { ColorFormat } from "@/types";

interface CodePanelProps {
  themeEditorState: ThemeEditorState;
  themeId?: string;
}

const CodePanel: React.FC<CodePanelProps> = ({ themeEditorState }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("index.css");
  const preset = useEditorStore((state) => state.themeState.preset);
  const colorFormat = usePreferencesStore((state) => state.colorFormat);
  const tailwindVersion = usePreferencesStore((state) => state.tailwindVersion);
  const setColorFormat = usePreferencesStore((state) => state.setColorFormat);
  const setTailwindVersion = usePreferencesStore((state) => state.setTailwindVersion);
  const getAvailableColorFormats = usePreferencesStore((state) => state.getAvailableColorFormats);

  const code = generateThemeCode(themeEditorState, colorFormat, tailwindVersion);
  const configCode = generateTailwindConfigCode(themeEditorState, colorFormat, tailwindVersion);
  const layoutCode = generateLayoutCode(themeEditorState);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex-none">
        <h2 className="text-lg font-semibold">Theme Code</h2>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <Select
          value={tailwindVersion}
          onValueChange={(value: "3" | "4") => {
            setTailwindVersion(value);
            if (value === "4" && colorFormat === "hsl") setColorFormat("oklch");
            if (activeTab === "tailwind.config.ts") setActiveTab("index.css");
          }}
        >
          <SelectTrigger className="bg-muted/50 w-fit gap-1 border-none outline-hidden focus:border-none focus:ring-transparent">
            <SelectValue className="focus:ring-transparent" />
          </SelectTrigger>
          <SelectContent className="z-99999">
            <SelectItem value="3">Tailwind v3</SelectItem>
            <SelectItem value="4">Tailwind v4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={colorFormat} onValueChange={(value: ColorFormat) => setColorFormat(value)}>
          <SelectTrigger className="bg-muted/50 w-fit gap-1 border-none outline-hidden focus:border-none focus:ring-transparent">
            <SelectValue className="focus:ring-transparent" />
          </SelectTrigger>
          <SelectContent className="z-99999">
            {getAvailableColorFormats().map((format) => (
              <SelectItem key={format} value={format}>{format}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="index.css"
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border"
      >
        <div className="bg-muted/50 flex flex-none items-center justify-between border-b px-4 py-2">
          <TabsList className="h-8 bg-transparent p-0">
            <TabsTrigger value="index.css" className="h-7 px-3 text-sm font-medium">index.css</TabsTrigger>
            {tailwindVersion === "3" && (
              <TabsTrigger value="tailwind.config.ts" className="h-7 px-3 text-sm font-medium">
                tailwind.config.ts
              </TabsTrigger>
            )}
            <TabsTrigger value="layout.tsx" className="h-7 px-3 text-sm font-medium">
              layout.tsx (Next.js)
            </TabsTrigger>
            <TabsIndicator className="bg-background rounded-sm" />
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(
              activeTab === "index.css" ? code : activeTab === "layout.tsx" ? layoutCode : configCode
            )}
            className="h-8"
            aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <TabsContent value="index.css" className="overflow-hidden">
          <ScrollArea className="relative h-full">
            <CodeBlock code={code} language="css" className="h-full rounded-none border-0" />
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </TabsContent>
        {tailwindVersion === "3" && (
          <TabsContent value="tailwind.config.ts" className="overflow-hidden">
            <ScrollArea className="relative h-full">
              <CodeBlock code={configCode} language="typescript" className="h-full rounded-none border-0" />
              <ScrollBar orientation="horizontal" />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </TabsContent>
        )}
        <TabsContent value="layout.tsx" className="overflow-hidden">
          <ScrollArea className="relative h-full">
            <CodeBlock code={layoutCode} language="tsx" className="h-full rounded-none border-0" />
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <span className="sr-only">{preset}</span>
    </div>
  );
};

export default CodePanel;
`;

const LOCAL_PRESET_SELECT = `import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useThemePresetStore } from "@/store/theme-preset-store";
import { getPresetThemeStyles } from "@/utils/theme-preset-helper";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Search, Shuffle } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { ThemeToggle } from "../theme-toggle";
import { TooltipWrapper } from "../tooltip-wrapper";

interface ThemePresetSelectProps extends React.ComponentProps<typeof Button> {
  withCycleThemes?: boolean;
}

const ColorBox = ({ color }: { color: string }) => (
  <div className="border-muted h-3 w-3 rounded-sm border" style={{ backgroundColor: color }} />
);

const ThemeColors = ({ presetName, mode }: { presetName: string; mode: "light" | "dark" }) => {
  const styles = getPresetThemeStyles(presetName)[mode];
  return <div className="flex gap-0.5"><ColorBox color={styles.primary} /><ColorBox color={styles.accent} /><ColorBox color={styles.secondary} /><ColorBox color={styles.border} /></div>;
};

const ThemeControls = ({ presetNames }: { presetNames: string[] }) => {
  const applyThemePreset = useEditorStore((store) => store.applyThemePreset);
  const randomize = useCallback(() => {
    applyThemePreset(presetNames[Math.floor(Math.random() * presetNames.length)]);
  }, [presetNames, applyThemePreset]);
  return <div className="flex gap-1"><ThemeToggle variant="ghost" size="icon" className="size-6 p-1" /><TooltipWrapper label="Random theme" asChild><Button variant="ghost" size="sm" className="size-6 p-1" onClick={randomize}><Shuffle className="h-3.5 w-3.5" /></Button></TooltipWrapper></div>;
};

const ThemeCycleButton = ({ direction, ...props }: React.ComponentProps<typeof Button> & { direction: "prev" | "next" }) => (
  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" {...props}>{direction === "prev" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{direction === "prev" ? "Previous theme" : "Next theme"}</TooltipContent></Tooltip>
);

const ThemePresetSelect: React.FC<ThemePresetSelectProps> = ({ withCycleThemes = true, className, ...props }) => {
  const themeState = useEditorStore((store) => store.themeState);
  const applyThemePreset = useEditorStore((store) => store.applyThemePreset);
  const hasUnsavedChanges = useEditorStore((store) => store.hasUnsavedChanges);
  const presets = useThemePresetStore((store) => store.getAllPresets());
  const [search, setSearch] = useState("");
  const builtInPresets = useMemo(
    () => Object.fromEntries(Object.entries(presets).filter(([, preset]) => preset.source === "BUILT_IN")),
    [presets]
  );
  const presetNames = useMemo(() => ["default", ...Object.keys(builtInPresets)], [builtInPresets]);
  const filteredPresets = useMemo(() => presetNames.filter((name) => {
    const label = name === "default" ? "default" : builtInPresets[name]?.label || name;
    return label.toLowerCase().includes(search.trim().toLowerCase());
  }), [builtInPresets, presetNames, search]);
  const currentPresetName = presetNames.find((name) => name === themeState.preset) || "default";
  const currentIndex = filteredPresets.indexOf(currentPresetName);
  const cycle = (offset: number) => applyThemePreset(filteredPresets[(currentIndex + offset + filteredPresets.length) % filteredPresets.length]);

  return (
    <div className="flex w-full items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className={cn("group relative w-full justify-between md:min-w-56", className)} {...props}>
            <div className="flex w-full items-center gap-3 overflow-hidden">
              <div className="flex gap-0.5"><ColorBox color={themeState.styles[themeState.currentMode].primary} /><ColorBox color={themeState.styles[themeState.currentMode].accent} /><ColorBox color={themeState.styles[themeState.currentMode].secondary} /><ColorBox color={themeState.styles[themeState.currentMode].border} /></div>
              <span className="truncate text-left font-medium capitalize">{builtInPresets[currentPresetName]?.label || currentPresetName}{hasUnsavedChanges() && "*"}</span>
            </div>
            <ChevronDown className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="center">
          <Command className="w-full">
            <div className="flex w-full items-center border-b px-3 py-1"><Search className="size-4 shrink-0 opacity-50" /><Input placeholder="Search themes..." className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <div className="flex items-center justify-between px-3 py-2"><div className="text-muted-foreground text-sm">{filteredPresets.length} theme{filteredPresets.length === 1 ? "" : "s"}</div><ThemeControls presetNames={presetNames} /></div>
            <Separator />
            <CommandList className="max-h-[500px]">
              <CommandEmpty>No themes found.</CommandEmpty>
              <CommandGroup heading="Built-in Themes">
                {filteredPresets.map((presetName, index) => (
                  <CommandItem key={presetName} value={\`${'${presetName}'}-${'${index}'}\`} onSelect={() => { applyThemePreset(presetName); setSearch(""); }} className="data-[highlighted]:bg-secondary/50 flex items-center gap-2 py-2">
                    <ThemeColors presetName={presetName} mode={themeState.currentMode} />
                    <span className="text-sm font-medium capitalize">{builtInPresets[presetName]?.label || presetName}</span>
                    {presetName === currentPresetName && <Check className="h-4 w-4 shrink-0 opacity-70" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {withCycleThemes && <><Separator orientation="vertical" className="min-h-8" /><ThemeCycleButton direction="prev" onClick={() => cycle(-1)} disabled={props.disabled || filteredPresets.length === 0} /><Separator orientation="vertical" className="min-h-8" /><ThemeCycleButton direction="next" onClick={() => cycle(1)} disabled={props.disabled || filteredPresets.length === 0} /></>}
    </div>
  );
};

export default ThemePresetSelect;
`;

function patchControlPanel(source) {
  let patched = source.replace(
    'import { AlertCircle, Sparkle } from "lucide-react";',
    'import { AlertCircle } from "lucide-react";',
  );
  patched = removeImport(patched, 'import { ChatInterface } from "@/components/editor/ai/chat-interface";');
  patched = removeImport(patched, 'import { useAIThemeGenerationCore } from "@/hooks/use-ai-theme-generation-core";');
  patched = patched.replace(/^\s*const \{ isGeneratingTheme \} = useAIThemeGenerationCore\(\);\n/m, '');
  patched = patched.replace(/ disabled=\{isGeneratingTheme\}/g, '');
  patched = patched.replace(/\s*<TabsTriggerPill[^>]*value="ai"[\s\S]*?<\/TabsTriggerPill>/, '');
  patched = patched.replace(/\s*<TabsContent value="ai"[\s\S]*?<\/TabsContent>/, '');
  return patched;
}

function patchPreviewPanel(source) {
  let patched = removeImport(source, 'import { useDialogActions } from "@/hooks/use-dialog-actions";');
  patched = patched.replace(/\nconst V0Logo = \([\s\S]*?\n\);\n/, '\n');
  patched = patched.replace(/^const V0Logo = .*?;\n/m, '');
  patched = patched.replace(/^\s*const \{ handleOpenInV0 \} = useDialogActions\(\);\n/m, '');
  patched = patched.replace(/\n\s*<TooltipWrapper label="Open theme in v0"[\s\S]*?<\/TooltipWrapper>/, '');
  patched = patched.replace(/^\s*<Button[^\n]*handleOpenInV0[^\n]*\n/m, '');
  return patched;
}

export const MANAGED_TRANSFORMS = Object.freeze({
  'app/page.tsx': Object.freeze({
    anchor: 'import { AIGenerationCTA } from "@/components/home/ai-generation-cta";',
    collision: 'const themePromise = Promise.resolve(null);',
    patch: () => LOCAL_ROOT_PAGE,
  }),
  'components/header.tsx': Object.freeze({
    anchor: 'import { UserProfileDropdown } from "@/components/user-profile-dropdown";',
    collision: 'csf-local-header',
    patch: patchHeader,
  }),
  'app/layout.tsx': Object.freeze({
    anchor: 'import { AuthDialogWrapper } from "@/components/auth-dialog-wrapper";',
    collision: 'csf-local-layout',
    patch: patchLayout,
  }),
  'hooks/use-dialog-actions.tsx': Object.freeze({
    anchor: 'import { ShareDialog } from "@/components/editor/share-dialog";',
    collision: 'interface DialogActionsContextType {\n  cssImportOpen: boolean;\n  codePanelOpen: boolean;',
    patch: () => LOCAL_DIALOG_ACTIONS,
  }),
  'components/editor/action-bar/action-bar.tsx': Object.freeze({
    anchor: 'const { isCreatingTheme, handleSaveClick, handleShareClick, setCssImportOpen, setCodePanelOpen } =',
    collision: 'const { setCssImportOpen, setCodePanelOpen } = useDialogActions();',
    patch: () => LOCAL_ACTION_BAR,
  }),
  'components/editor/action-bar/components/action-bar-buttons.tsx': Object.freeze({
    anchor: 'import { PublishButton } from "./publish-button";',
    collision: 'interface ActionBarButtonsProps {\n  onImportClick: () => void;\n  onExportClick: () => void;\n}',
    patch: () => LOCAL_ACTION_BAR_BUTTONS,
  }),
  'components/editor/code-panel.tsx': Object.freeze({
    anchor: 'const [registryCopied, setRegistryCopied] = useState(false);',
    collision: 'const CodePanel: React.FC<CodePanelProps> = ({ themeEditorState }) => {',
    patch: () => LOCAL_CODE_PANEL,
  }),
  'components/editor/theme-preset-select.tsx': Object.freeze({
    anchor: 'const loadSavedPresets = useThemePresetStore((store) => store.loadSavedPresets);',
    collision: 'const builtInPresets = useMemo(',
    patch: () => LOCAL_PRESET_SELECT,
  }),
  'components/editor/theme-control-panel.tsx': Object.freeze({
    anchor: 'import { ChatInterface } from "@/components/editor/ai/chat-interface";',
    collision: 'csf-local-control-panel',
    patch: patchControlPanel,
  }),
  'components/editor/theme-preview-panel.tsx': Object.freeze({
    anchor: 'import { useDialogActions } from "@/hooks/use-dialog-actions";',
    collision: 'csf-local-preview-panel',
    patch: patchPreviewPanel,
  }),
});

export function patchManagedSource(path, source) {
  const transform = MANAGED_TRANSFORMS[path];
  if (!transform) fail(`no managed transform for ${path}`);
  const matches = source.split(transform.anchor).length - 1;
  if (matches !== 1) fail(`expected exactly one managed anchor in ${path}: ${JSON.stringify(transform.anchor)}`);
  if (source.includes(transform.collision)) fail(`managed source is already patched or collides in ${path}`);
  const patched = transform.patch(source);
  if (patched === source) fail(`managed transform made no change in ${path}`);
  if (patched.includes(transform.anchor)) fail(`managed transform left its upstream anchor in ${path}`);
  return patched;
}

function presetStyles(themeCss, paletteId) {
  const values = palettePresetValues(themeCss, paletteId);
  const omitted = new Set([
    ...values.shadowControlNames,
    'shadow-2xs',
    'shadow-xs',
    'shadow-sm',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',
    'shadow-2xl',
  ]);
  const light = Object.fromEntries(Object.entries(values.light).filter(([name]) => !omitted.has(name)));
  for (const name of values.shadowControlNames) light[name] = values.light[name];
  const dark = Object.fromEntries(Object.entries(values.dark).filter(([name]) => !omitted.has(name)));
  return { light, dark };
}

export function generateRepositoryPresetSource(themeCss) {
  const expectedPalettes = new Set(PALETTES.map(({ id }) => id));
  if (
    REPOSITORY_PRESETS.length !== expectedPalettes.size ||
    REPOSITORY_PRESETS.some(({ paletteId }) => !expectedPalettes.delete(paletteId)) ||
    expectedPalettes.size !== 0
  ) {
    fail('repository preset mapping must cover every canonical palette exactly once');
  }
  const presets = Object.fromEntries(
    REPOSITORY_PRESETS.map(({ paletteId, presetId, label }) => [
      presetId,
      { label, source: 'BUILT_IN', styles: presetStyles(themeCss, paletteId) },
    ]),
  );
  return `import { ThemePreset } from "../types/theme";\n\nexport const csfRepositoryPresets: Record<string, ThemePreset> = ${JSON.stringify(presets, null, 2)};\n`;
}

export function patchUpstreamNextConfig(source) {
  const importAnchor = 'import { type NextConfig } from "next";';
  const turbopackAnchor = '  turbopack: {\n';
  for (const anchor of [importAnchor, turbopackAnchor]) {
    const matches = source.split(anchor).length - 1;
    if (matches !== 1) fail(`expected exactly one upstream next-config anchor ${JSON.stringify(anchor)}`);
  }
  if (source.includes('root: process.cwd()') || source.includes('root: resolve(process.cwd()')) {
    fail('upstream next config already defines the runtime root');
  }
  return source
    .replace(importAnchor, `${importAnchor}\nimport { resolve } from "node:path";`)
    .replace(turbopackAnchor, `${turbopackAnchor}    root: resolve(process.cwd(), ".."),\n`);
}

export function patchUpstreamPresetSource(source) {
  const importAnchor = 'import { ThemePreset } from "../types/theme";';
  const declarationAnchor = 'export const defaultPresets: Record<string, ThemePreset> = {';
  for (const anchor of [importAnchor, declarationAnchor]) {
    const matches = source.split(anchor).length - 1;
    if (matches !== 1) fail(`expected exactly one upstream injection anchor ${JSON.stringify(anchor)}`);
  }
  for (const { presetId } of REPOSITORY_PRESETS) {
    if (new RegExp(`["']${presetId.replaceAll('-', '\\-')}["']\\s*:`).test(source)) {
      fail(`upstream preset id collision: ${presetId}`);
    }
  }
  return source
    .replace(importAnchor, `${importAnchor}\nimport { csfRepositoryPresets } from "./csf-repository-presets";`)
    .replace(declarationAnchor, `${declarationAnchor}\n  ...csfRepositoryPresets,`);
}

async function assertRegularDirectory(path, label) {
  const stat = await lstat(path).catch(() => null);
  if (!stat) return false;
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a regular directory: ${path}`);
  return true;
}

async function validateCheckout(config) {
  if (!(await assertRegularDirectory(config.checkout, 'checkout'))) {
    fail(`checkout does not exist at ${config.checkout}; run pnpm tweakcn:setup`);
  }
  if (!existsSync(join(config.checkout, '.git'))) fail(`${config.checkout} is not a Git checkout`);
  if (git(config.checkout, 'status', '--porcelain') !== '') fail('checkout is dirty');
  const head = git(config.checkout, 'rev-parse', 'HEAD');
  if (head !== config.commit) fail(`checkout is not at pinned commit ${config.commit}; found ${head}`);
  const symbolic = spawnSync('git', ['-C', config.checkout, 'symbolic-ref', '-q', 'HEAD']);
  if (symbolic.status === 0) fail('checkout must be detached at the pinned commit');
}

async function dependencyTarget(checkout) {
  const target = join(checkout, 'node_modules');
  if (!(await assertRegularDirectory(target, 'checkout node_modules'))) {
    fail('dependencies are missing; run pnpm tweakcn:setup');
  }
  if (!existsSync(join(target, '.bin', 'next'))) {
    fail('Next executable is missing; run pnpm tweakcn:setup');
  }
  return realpath(target);
}

function patchInputHash() {
  return hash(
    JSON.stringify({
      generatorVersion: GENERATOR_VERSION,
      repositoryPresets: REPOSITORY_PRESETS,
      transforms: Object.entries(MANAGED_TRANSFORMS).map(([path, transform]) => [
        path,
        transform.anchor,
        transform.collision,
        transform.patch.toString(),
      ]),
      presetGenerator: generateRepositoryPresetSource.toString(),
      presetPatch: patchUpstreamPresetSource.toString(),
      nextPatch: patchUpstreamNextConfig.toString(),
    }),
  );
}

async function markerFor({ config, themeCss, files }) {
  return {
    schema: MARKER_SCHEMA,
    generatorVersion: GENERATOR_VERSION,
    patchInputHash: patchInputHash(),
    checkout: await realpath(config.checkout),
    runtime: resolve(config.runtime),
    commit: config.commit,
    themeHash: hash(themeCss),
    files: Object.fromEntries(
      [...files.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([path, entry]) => [path, { sourceHash: hash(entry.source), patchedHash: hash(entry.patched) }]),
    ),
  };
}

async function readOwnedMarker(runtime, expectedOwner = undefined) {
  if (!(await assertRegularDirectory(runtime, 'runtime'))) return null;
  const markerPath = join(runtime, MARKER_NAME);
  const stat = await lstat(markerPath).catch(() => null);
  if (!stat || stat.isSymbolicLink() || !stat.isFile()) fail(`refusing to replace unmarked runtime ${runtime}`);
  let marker;
  try {
    marker = JSON.parse(await readFile(markerPath, 'utf8'));
  } catch (error) {
    fail(`refusing malformed runtime marker ${markerPath}: ${error.message}`);
  }
  if (
    marker.schema !== MARKER_SCHEMA ||
    marker.runtime !== resolve(runtime) ||
    typeof marker.generatorVersion !== 'number' ||
    typeof marker.checkout !== 'string' ||
    typeof marker.commit !== 'string'
  ) {
    fail(`runtime marker has foreign or invalid ownership: ${runtime}`);
  }
  if (expectedOwner && marker.checkout !== expectedOwner.checkout) {
    fail(`runtime marker belongs to a different checkout: ${runtime}`);
  }
  return marker;
}

async function validateManagedFiles(root, marker) {
  if (!marker.files || typeof marker.files !== 'object') return false;
  for (const [path, expected] of Object.entries(marker.files)) {
    const source = await readFile(join(root, path), 'utf8').catch(() => null);
    if (source === null || hash(source) !== expected.patchedHash) return false;
  }
  return true;
}

async function runtimeMatches(runtime, expected) {
  const marker = await readOwnedMarker(runtime, expected);
  if (!marker) return false;
  if (JSON.stringify(marker) !== JSON.stringify(expected)) return false;
  if (!(await validateManagedFiles(runtime, marker))) return false;
  const link = join(runtime, 'node_modules');
  const stat = await lstat(link).catch(() => null);
  if (!stat?.isSymbolicLink()) return false;
  const target = resolve(dirname(link), await readlink(link));
  return (await realpath(target).catch(() => null)) === expected.checkout + '/node_modules';
}

async function extractCommittedTree(config, stage) {
  const archive = `${stage}.tar`;
  await rm(archive, { force: true });
  run('git', ['-C', config.checkout, 'archive', '--format=tar', '--output', archive, config.commit]);
  await mkdir(stage, { recursive: true });
  try {
    run('tar', ['-xf', archive, '-C', stage]);
  } finally {
    await rm(archive, { force: true });
  }
}

async function buildStage({ config, stage, dependencyPath, files, marker }) {
  await extractCommittedTree(config, stage);
  for (const [path, entry] of files) {
    await writeFile(join(stage, path), entry.patched);
  }
  await symlink(dependencyPath, join(stage, 'node_modules'));
  if (!(await validateManagedFiles(stage, marker))) fail('staged runtime validation failed');
  await writeFile(join(stage, MARKER_NAME), `${JSON.stringify(marker, null, 2)}\n`);
}

async function managedFiles(config, themeCss) {
  const files = new Map();
  const upstreamPresets = await readFile(join(config.checkout, UPSTREAM_PRESETS), 'utf8');
  const upstreamNextConfig = await readFile(join(config.checkout, UPSTREAM_NEXT_CONFIG), 'utf8');
  const generatedPresets = generateRepositoryPresetSource(themeCss);
  files.set(GENERATED_PRESETS, { source: themeCss, patched: generatedPresets });
  files.set(UPSTREAM_PRESETS, {
    source: upstreamPresets,
    patched: patchUpstreamPresetSource(upstreamPresets),
  });
  files.set(UPSTREAM_NEXT_CONFIG, {
    source: upstreamNextConfig,
    patched: patchUpstreamNextConfig(upstreamNextConfig),
  });
  for (const path of Object.keys(MANAGED_TRANSFORMS)) {
    const source = await readFile(join(config.checkout, path), 'utf8');
    files.set(path, { source, patched: patchManagedSource(path, source) });
  }
  return files;
}

async function expectedRuntime({ config, themeCss }) {
  if (resolve(config.checkout) === resolve(config.runtime)) fail('checkout and runtime must be distinct');
  await validateCheckout(config);
  const dependencyPath = await dependencyTarget(config.checkout);
  const files = await managedFiles(config, themeCss);
  const marker = await markerFor({ config, themeCss, files });
  return { dependencyPath, files, marker };
}

export async function requireTweakcnRuntime({ config, themeCss }) {
  const { marker } = await expectedRuntime({ config, themeCss });
  if (!(await runtimeMatches(config.runtime, marker))) {
    fail(`runtime is missing or stale at ${config.runtime}; run pnpm tweakcn:setup`);
  }
  await validateCheckout(config);
  return { runtime: config.runtime, reused: true, marker };
}

export async function ensureTweakcnRuntime({ config, themeCss }) {
  const { dependencyPath, files, marker } = await expectedRuntime({ config, themeCss });

  if (await runtimeMatches(config.runtime, marker)) {
    await validateCheckout(config);
    return { runtime: config.runtime, reused: true, marker };
  }

  const parent = dirname(config.runtime);
  await mkdir(parent, { recursive: true });
  const stage = `${config.runtime}.stage-${process.pid}`;
  const backup = `${config.runtime}.backup-${process.pid}`;
  await rm(stage, { recursive: true, force: true });
  await rm(backup, { recursive: true, force: true });
  try {
    await buildStage({ config, stage, dependencyPath, files, marker });
    const existing = await readOwnedMarker(config.runtime, marker);
    if (existing) await rename(config.runtime, backup);
    try {
      await rename(stage, config.runtime);
    } catch (error) {
      if (existing) await rename(backup, config.runtime);
      throw error;
    }
    await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
  if (!(await runtimeMatches(config.runtime, marker))) fail('materialized runtime failed validation');
  await validateCheckout(config);
  return { runtime: config.runtime, reused: false, marker };
}

export const RUNTIME_FILES = Object.freeze({ marker: MARKER_NAME, generated: GENERATED_PRESETS });
