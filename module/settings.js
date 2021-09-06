export const registerSystemSettings = async function() {

  /**
   * Track the system version upon which point a migration was last applied
   */
  await game.settings.register("bitd", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: 0
  });

  await game.settings.register('blades-in-the-dark', 'populateFromCompendia', {
    name: 'Load Compendium Playbooks',
    hint: 'Include Compendium Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks',
    scope: 'world',     // "world" = sync to db, "client" = local storage
    config: true,       // false if you dont want it to show in module config
    type: Boolean,       // Number, Boolean, String,
    default: {},
    onChange: value => { // value is the new value of the setting
      console.log(value)
    }
  });

  await game.settings.register('blades-in-the-dark', 'populateFromWorld', {
    name: 'Load World Playbooks',
    hint: 'Include World (Custom) Playbooks, NPCs, Items, and Abilities When Auto-Populating Playbooks',
    scope: 'world',     // "world" = sync to db, "client" = local storage
    config: true,       // false if you dont want it to show in module config
    type: Boolean,       // Number, Boolean, String,
    default: false,
    onChange: value => { // value is the new value of the setting
      console.log(value)
    }
  });
};
