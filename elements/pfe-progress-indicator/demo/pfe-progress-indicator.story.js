import { storiesOf } from "@storybook/polymer";
import * as storybookBridge from "@storybook/addon-knobs/polymer";
import * as tools from "../../../.storybook/utils.js";

import PfeProgressIndicator from "../pfe-progress-indicator";

const stories = storiesOf("Progress indicator", module);

// Define the template to be used
const template = (data = {}) => {
  return tools.component(PfeProgressIndicator.tag, data.prop, data.slots);
};

stories.addDecorator(storybookBridge.withKnobs);

stories.add(PfeProgressIndicator.tag, () => {

  let config = {};
  const props = PfeProgressIndicator.properties;

  // Trigger the auto generation of the knobs for attributes
  config.prop = tools.autoPropKnobs(props, storybookBridge);

  const slots = PfeProgressIndicator.slots;

  // Trigger the auto generation of the knobs for slots
  config.has = tools.autoContentKnobs(slots, storybookBridge);

  const rendered = template(config);
  return tools.preview(rendered);
});