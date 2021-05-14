/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { registerSystemSettings } from "./settings.js";
import { preloadHandlebarsTemplates } from "./blades-templates.js";
import { bladesRoll, simpleRollPopup } from "./blades-roll.js";
import { BladesHelpers } from "./blades-helpers.js";
import { BladesActor } from "./blades-actor.js";
import { BladesItem } from "./blades-item.js";
import { BladesItemSheet } from "./blades-item-sheet.js";
import { BladesActorSheet } from "./blades-actor-sheet.js";
import { BladesCrewSheet } from "./blades-crew-sheet.js";
import { BladesClockSheet } from "./blades-clock-sheet.js";
import { BladesNPCSheet } from "./blades-npc-sheet.js";
import { BladesFactionSheet } from "./blades-faction-sheet.js";
import * as migrations from "./migration.js";

window.BladesHelpers = BladesHelpers;

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */
Hooks.once("init", async function() {
  console.log(`Initializing Blades In the Dark System`);

  game.blades = {
    dice: bladesRoll
  }

  CONFIG.Item.entityClass = BladesItem;
  CONFIG.Actor.entityClass = BladesActor;

  // Register System Settings
  registerSystemSettings();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("blades", BladesActorSheet, { types: ["character"], makeDefault: true });
  Actors.registerSheet("blades", BladesCrewSheet, { types: ["crew"], makeDefault: true });
  Actors.registerSheet("blades", BladesFactionSheet, { types: ["factions"], makeDefault: true });
  Actors.registerSheet("blades", BladesClockSheet, { types: ["\uD83D\uDD5B clock"], makeDefault: true });
  Actors.registerSheet("blades", BladesNPCSheet, { types: ["npc"], makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("blades", BladesItemSheet, {makeDefault: true});
  preloadHandlebarsTemplates();
  
  Actors.registeredSheets.forEach(element => console.log(element.Actor.name));


  // Is the value Turf side.
  Handlebars.registerHelper('is_turf_side', function(value, options) {
    if (["left", "right", "top", "bottom"].includes(value)) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  // Multiboxes.
  Handlebars.registerHelper('multiboxes', function(selected, options) {

    let html = options.fn(this);

    // Fix for single non-array values.
    if ( !Array.isArray(selected) ) {
      selected = [selected];
    }

    if (typeof selected !== 'undefined') {
      selected.forEach(selected_value => {
        if (selected_value !== false) {
          const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected_value));
          const rgx = new RegExp(' value=\"' + escapedValue + '\"');
          html = html.replace(rgx, "$& checked=\"checked\"");
        }
      });
    }
    return html;
  });

  // Trauma Counter
  Handlebars.registerHelper('traumacounter', function(selected, options) {

    let html = options.fn(this);

    var count = 0;
    for (const trauma in selected) {
      if (selected[trauma] === true) {
        count++;
      }
    }

    if (count > 4) count = 4;

    const rgx = new RegExp(' value=\"' + count + '\"');
    return html.replace(rgx, "$& checked=\"checked\"");

  });

  // NotEquals handlebar.
  Handlebars.registerHelper('noteq', (a, b, options) => {
    return (a !== b) ? options.fn(this) : '';
  });

  // ReputationTurf handlebar.
  Handlebars.registerHelper('repturf', (turfs_amount, options) => {
    let html = options.fn(this);
    var turfs_amount_int = parseInt(turfs_amount);

    // Can't be more than 6.
    if (turfs_amount_int > 6) {
      turfs_amount_int = 6;
    }

    for (let i = 13 - turfs_amount_int; i <= 12; i++) {
      const rgx = new RegExp(' value=\"' + i + '\"');
      html = html.replace(rgx, "$& disabled=\"disabled\"");
    }
    return html;
  });

  Handlebars.registerHelper('crew_vault_coins', (max_coins, options) => {

    let html = options.fn(this);
    for (let i = 1; i <= max_coins; i++) {

      html += "<input type=\"radio\" id=\"crew-coins-vault-" + i + "\" name=\"data.vault.value\" value=\"" + i + "\"><label for=\"crew-coins-vault-" + i + "\"></label>";
    }

    return html;
  });

  Handlebars.registerHelper('crew_experience', (options) => {

    let html = options.fn(this);
    for (let i = 1; i <= 10; i++) {

      html += '<input type="radio" id="crew-experience-' + i + '" name="data.experience" value="' + i + '" dtype="Radio"><label for="crew-experience-' + i + '"></label>';
    }

    return html;
  });

  // Enrich the HTML replace /n with <br>
  Handlebars.registerHelper('html', (options) => {

    let text = options.hash['text'].replace(/\n/g, "<br />");

    return new Handlebars.SafeString(text);;
  });

  // "N Times" loop for handlebars.
  //  Block is executed N times starting from n=1.
  //
  // Usage:
  // {{#times_from_1 10}}
  //   <span>{{this}}</span>
  // {{/times_from_1}}
  Handlebars.registerHelper('times_from_1', function(n, block) {

    var accum = '';
    for (var i = 1; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  // "N Times" loop for handlebars.
  //  Block is executed N times starting from n=0.
  //
  // Usage:
  // {{#times_from_0 10}}
  //   <span>{{this}}</span>
  // {{/times_from_0}}
  Handlebars.registerHelper('times_from_0', function(n, block) {

    var accum = '';
    for (var i = 0; i <= n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  // Concat helper
  // https://gist.github.com/adg29/f312d6fab93652944a8a1026142491b1
  // Usage: (concat 'first 'second')
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for(var arg in arguments){
        if(typeof arguments[arg]!='object'){
            outStr += arguments[arg];
        }
    }
    return outStr;
  });


  /**
   * @inheritDoc
   * Takes label from Selected option instead of just plain value.
   */

  Handlebars.registerHelper('selectOptionsWithLabel', function(choices, options) {

    const localize = options.hash['localize'] ?? false;
    let selected = options.hash['selected'] ?? null;
    let blank = options.hash['blank'] || null;
    selected = selected instanceof Array ? selected.map(String) : [String(selected)];

    // Create an option
    const option = (key, object) => {
      if ( localize ) object.label = game.i18n.localize(object.label);
      let isSelected = selected.includes(key);
      html += `<option value="${key}" ${isSelected ? "selected" : ""}>${object.label}</option>`
    };

    // Create the options
    let html = "";
    if ( blank ) option("", blank);
    Object.entries(choices).forEach(e => option(...e));

    return new Handlebars.SafeString(html);
  });


  /**
   * Create appropriate Blades clock
   */

  Handlebars.registerHelper('blades-clock', function(parameter_name, type, current_value, uniq_id) {

    let html = '';

    if (current_value === null) {
      current_value = 0;
    }

    if (parseInt(current_value) > parseInt(type)) {
      current_value = type;
    }

    // Label for 0
    html += `<label class="clock-zero-label" for="clock-0-${uniq_id}}"><i class="fab fa-creative-commons-zero nullifier"></i></label>`;
    html += `<div id="blades-clock-${uniq_id}" class="blades-clock clock-${type} clock-${type}-${current_value}" style="background-image:url('/systems/blades-in-the-dark/styles/assets/progressclocks-svg/Progress Clock ${type}-${current_value}.svg');">`;

    let zero_checked = (parseInt(current_value) === 0) ? 'checked="checked"' : '';
    html += `<input type="radio" value="0" id="clock-0-${uniq_id}}" name="${parameter_name}" ${zero_checked}>`;

    for (let i = 1; i <= parseInt(type); i++) {
      let checked = (parseInt(current_value) === i) ? 'checked="checked"' : '';
      html += `
        <input type="radio" value="${i}" id="clock-${i}-${uniq_id}" name="${parameter_name}" ${checked}>
        <label for="clock-${i}-${uniq_id}"></label>
      `;
    }

    html += `</div>`;
    return html;
  });


  Handlebars.registerHelper('inline-editable-text', function(parameter_name, blank_value, current_value, uniq_id, context){
    let html = '';
    if(current_value.length === 0){
      current_value = blank_value;
    }
    html += `<input data-input="character-${uniq_id}-${parameter_name}" name="${parameter_name}" type="hidden" value="${current_value}" placeholder="${blank_value}"><span ${context.owner ? 'contenteditable="true"' : null} spellcheck="false" data-target="character-${uniq_id}-${parameter_name}" data-placeholder="${blank_value}">${current_value}</span>`;
    return html;
  });

});

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", function() {

  // Determine whether a system migration is required
  const currentVersion = game.settings.get("bitd", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = 2.15;

  let needMigration = (currentVersion < NEEDS_MIGRATION_VERSION) || (currentVersion === null);

  // Perform the migration
  if ( needMigration && game.user.isGM ) {
    migrations.migrateWorld();
  }
});

/*
 * Hooks
 */
Hooks.on("preCreateOwnedItem", (parent_entity, child_data, options, userId) => {
  BladesHelpers.removeDuplicatedItemType(child_data, parent_entity);

  return true;
});

Hooks.on("createOwnedItem", async (parent_entity, child_data, options, userId) => {

  await BladesHelpers.callItemLogic(child_data, parent_entity);
  return true;
});

Hooks.on("deleteOwnedItem", async (parent_entity, child_data, options, userId) => {

  await BladesHelpers.undoItemLogic(child_data, parent_entity);
  return true;
});
// getSceneControlButtons
Hooks.on("renderSceneControls", async (app, html) => {
  let dice_roller = $('<li class="scene-control" title="Dice Roll"><i class="fas fa-dice"></i></li>');
  dice_roller.click(function() {
    simpleRollPopup();
  });
  html.append(dice_roller);
});


Hooks.on("createActor", async (actor, options, actorId)=>{
  if(actor.data.type == "character"){
    //check for class
    if(actor.data.data.playbook == ""){
      //pick a default class
      let classIndex = await game.packs.get("blades-in-the-dark.class").getIndex();
      //let defaultClass = await game.packs.get("blades-in-the-dark.class").getEntry(classIndex[0]._id);
      //add default class
      let data = {
        data:{
          playbook: classIndex[0]._id,
        },
        new_character: true
      }
      await actor.update(data);
    }

    //add class abilities
    //let all_abilities = await game.packs.get("blades-in-the-dark.ability").getContent();
    let selected_playbook_full = await game.packs.get("blades-in-the-dark.class").getEntry(actor.data.data.playbook);
    let selected_playbook_name = selected_playbook_full.name;
    let all_owned_items = actor.items.filter(item => item.data.type == "item");
    let class_items = all_owned_items.filter(item => item.data.data.class == selected_playbook_name);
    let generic_items = all_owned_items.filter(item => item.data.data.class == "");
    
    let abilities = actor.items.filter(item => {
      return getProperty(item, 'data.type') == "ability"
    });

    if(abilities.length <= 0){
      console.log("Adding class abilities");
      //add class abilities
      await BladesHelpers.addPlaybookAbilities(actor, selected_playbook_name);
    }


    if(class_items.length <= 0){
      console.log("Adding class items");
      //let allAvailableItems = await BladesHelpers.getAllItemsByType('item', game);
      await BladesHelpers.addPlaybookItems(actor, selected_playbook_name);
    }

    if(generic_items.length <= 0){
      console.log("Adding generic items")
      //let allAvailableItems = await BladesHelpers.getAllItemsByType('item', game);
      await BladesHelpers.addGenericItems(actor);
    }

    if(Object.keys(actor.data.data.acquaintances).length <= 0){
      console.log("Adding class acquaintances");
      //add class aquaintances
      await BladesHelpers.addPlaybookAcquaintances(actor, selected_playbook_name);
    }

    //adding traumas for testing - doesn't render correctly on first load after creation, but it should also probably never get added this way, so *shrug*. 
    //await actor.update({"data.trauma.list" : ["haunted", "reckless", "paranoid"]});

    //clearing default [0] array
    await actor.update({"data.trauma.list" : []});
  }
});

Hooks.on("updateActor", async (actor, newData, meta, actorId) => {
  if(actor.data.type == "character" && meta.diff && newData.data && newData.data.playbook && !newData.new_character /* && newData.data.playbook != actor.data.data.playbook */){
    console.log("Update actor, new playbook", actor, newData, meta);
    let playbooks_index = await game.packs.get("blades-in-the-dark.class").getIndex();
    let new_playbook_name = playbooks_index.find(item => item._id == newData.data.playbook).name;
    //remove all skills, with an exception for new weird playbook selection
    await BladesHelpers.clearAbilities(actor, new_playbook_name == "Ghost" || new_playbook_name == "Hull" || new_playbook_name == "Vampire");
    await BladesHelpers.addPlaybookAbilities(actor, new_playbook_name);
    await BladesHelpers.clearPlaybookItems(actor, true);
    await BladesHelpers.addPlaybookItems(actor, new_playbook_name);
    await BladesHelpers.clearAcquaintances(actor, true);
    await BladesHelpers.addPlaybookAcquaintances(actor, new_playbook_name);
    
  }
  return true;
});


