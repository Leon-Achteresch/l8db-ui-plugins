import { asText, Badge, definePlugin } from "@l8db/ui";

export default definePlugin({
  id: "l8db.prod-tab-warning",
  name: "Produktions-Warnung im Tab",
  description:
    "Markiert jeden Tab einer Produktionsverbindung mit einem roten Hinweis, Staging auf Wunsch gelb. So arbeitet niemand versehentlich live.",
  version: "1.0.0",
  author: "l8db",
  options: {
    label: { type: "text", label: "Hinweis für Produktion", default: "PROD" },
    staging: { type: "boolean", label: "Staging gelb markieren", default: true },
  },
  slots: (options) => ({
    tabs: {
      item: ({ tab, Default }) => {
        const environment = tab.connection?.environment;
        if (environment === "production")
          return (
            <>
              <Default />
              <Badge tone="danger">{asText(options.label) || "PROD"}</Badge>
            </>
          );
        if (options.staging && environment === "staging")
          return (
            <>
              <Default />
              <Badge tone="warning">STAGE</Badge>
            </>
          );
        return undefined;
      },
    },
  }),
});
