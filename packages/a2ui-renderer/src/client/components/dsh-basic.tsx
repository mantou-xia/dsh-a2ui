/** Browser registrations for the built-in dsh-basic catalog library. */

import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";
import type { A2uiComponentRegistry, A2uiComponentRendererProps } from "../registry.ts";
import { CalloutView, CardView, ChartView, GridView, StatView, TableView, TabsView } from "./static.tsx";
import {
  ButtonView,
  DateTimeView,
  FileView,
  FormView,
  InputView,
  ModalView,
  SelectView,
  SliderView,
  SwitchView,
} from "./interactive.tsx";

const CATALOG_ID = "dsh-basic";
const fieldComponents = new Set(["input", "select", "datetime", "switch", "slider", "file"]);

function action(props: A2uiComponentRendererProps): (action: { name: string; payload?: unknown }) => void {
  return (value) => props.emit(value);
}

function fields(components: readonly A2uiComponent[]): string[] {
  return components.filter((component) => fieldComponents.has(component.component)).map((component) => component.id);
}

/** Register all dsh-basic React components and return a composite disposer. */
export function registerDshBasicComponents(registry: A2uiComponentRegistry): () => void {
  const disposers = [
    registry.register(CATALOG_ID, "stat", ({ component }) => <StatView component={component} />),
    registry.register(CATALOG_ID, "table", ({ component }) => <TableView component={component} />),
    registry.register(CATALOG_ID, "chart", ({ component, colorScheme }) => <ChartView component={component} colorScheme={colorScheme} />),
    registry.register(CATALOG_ID, "card", ({ component, children }) => <CardView component={component}>{children}</CardView>),
    registry.register(CATALOG_ID, "grid", ({ component, children }) => <GridView component={component}>{children}</GridView>),
    registry.register(CATALOG_ID, "tabs", ({ component, children }) => <TabsView component={component}>{children}</TabsView>),
    registry.register(CATALOG_ID, "modal", (props) => <ModalView component={props.component} onAction={action(props)}>{props.children}</ModalView>),
    registry.register(CATALOG_ID, "callout", ({ component }) => <CalloutView component={component} />),
    registry.register(CATALOG_ID, "button", (props) => <ButtonView component={props.component} onAction={action(props)} />),
    registry.register(CATALOG_ID, "form", (props) => <FormView component={props.component} fieldIds={fields(props.childComponents)} onAction={action(props)}>{props.children}</FormView>),
    registry.register(CATALOG_ID, "input", ({ component }) => <InputView component={component} />),
    registry.register(CATALOG_ID, "select", ({ component }) => <SelectView component={component} />),
    registry.register(CATALOG_ID, "datetime", ({ component }) => <DateTimeView component={component} />),
    registry.register(CATALOG_ID, "switch", ({ component }) => <SwitchView component={component} />),
    registry.register(CATALOG_ID, "slider", ({ component }) => <SliderView component={component} />),
    registry.register(CATALOG_ID, "file", ({ component }) => <FileView component={component} />),
  ];
  return () => {
    for (const dispose of disposers.reverse()) dispose();
  };
}
