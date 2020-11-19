import Cookies from "js-cookie";
import { Plugin } from "@nuxt/types";

const COOKIE_PREFIX: string = "gopt";
const EVENT_HANDLER: string = "<%= options.eventHandler %>";
const EXPERIMENTS: Experiment[] = require("<%= options.experiments %>");

const reportedVariants: string[] = [];

function weightedRandom(weights: number[]): string {
  var totalWeight = 0,
    i,
    random;

  for (i = 0; i < weights.length; i++) {
    totalWeight += weights[i];
  }

  random = Math.random() * totalWeight;

  for (i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      return i.toString();
    }

    random -= weights[i];
  }

  return "";
}

export function experimentVariant(experimentName: string): number {
  const experiment: Experiment | undefined = EXPERIMENTS.find(
    (exp: Experiment) => exp.name === experimentName
  );

  if (!experiment) return 0;

  // Determine the active variant of the experiment
  let activeVariant: string =
    Cookies.get(`${COOKIE_PREFIX}_${experimentName}`) || "";

  if (activeVariant.length === 0) {
    const weights: number[] = experiment.variants.map((weight) =>
      weight === undefined ? 1 : weight
    );

    let retries = experiment.variants.length;
    while (activeVariant === "" && retries-- > 0) {
      activeVariant = weightedRandom(weights);
    }

    Cookies.set(`${COOKIE_PREFIX}_${experimentName}`, activeVariant, {
      expires: experiment.maxAgeDays,
    });
  }

  // Let Google know about the active experiment's variant
  if (reportedVariants.indexOf(experimentName) === -1) {
    if (EVENT_HANDLER === "ga" && window.ga) {
      window.ga("set", "exp", `${experiment.id}.${activeVariant}`);

      reportedVariants.push(experimentName);
    } else if (EVENT_HANDLER === "dataLayer" && window.dataLayer) {
      window.dataLayer.push({
        expId: experiment.id,
        expVar: activeVariant,
      });

      reportedVariants.push(experimentName);
    }
  }

  return Number.parseInt(activeVariant);
}

const googleOptimizePlugin: Plugin = (ctx, inject): void => {
  inject("gexp", experimentVariant);
};

export default googleOptimizePlugin;
