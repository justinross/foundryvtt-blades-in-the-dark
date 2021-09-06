/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  ui.notifications.info(`Applying BITD Actors migration for version ${game.system.data.version}. Please be patient and do not close your game or shut down your server.`, {permanent: true});

  // Migrate World Actors
  for ( let a of game.actors.contents ) {
    if (a.data.type === 'character') {
      try {
        const updateData = await _migrateActor(a);
        if ( !isObjectEmpty(updateData) ) {
          console.log(`Migrating Actor entity ${a.name}`);
          await a.update(updateData, {enforceTypes: false});
        }
      } catch(err) {
        console.error(err);
      }
    }

    // Migrate Token Link for Character and Crew
    if (a.data.type === 'character' || a.data.type === 'crew') {
      try {
        const updateData = _migrateTokenLink(a.data);
        if ( !isObjectEmpty(updateData) ) {
          console.log(`Migrating Token Link for ${a.name}`);
          await a.update(updateData, {enforceTypes: false});
        }
      } catch(err) {
        console.error(err);
      }
    }

  }

  // Migrate Actor Link
  for ( let s of game.scenes.contents ) {
    try {
      const updateData = _migrateSceneData(s.data);
      if ( !isObjectEmpty(updateData) ) {
        console.log(`Migrating Scene entity ${s.name}`);
        await s.update(updateData, {enforceTypes: false});
      }
    } catch(err) {
      console.error(err);
    }
  }

  // Set the migration as complete
  game.settings.set("bitd", "systemMigrationVersion", game.system.data.version);
  ui.notifications.info(`BITD System Migration to version ${game.system.data.version} completed!`, {permanent: true});
};


/* -------------------------------------------- */

/**
 * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export const _migrateSceneData = function(scene) {
  const tokens = duplicate(scene.tokens);
  return {
    tokens: tokens.map(t => {
      t.actorLink = true;
      t.actorData = {};
      return t;
    })
  };
};

/* -------------------------------------------- */

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate the actor attributes
 * @param {Actor} actor   The actor to Update
 * @return {Object}       The updateData to apply
 */
async function _migrateActor(actor) {
  let updateData = {}

  // Migrate Skills
  const attributes = game.system.model.Actor.character.attributes;
  for ( let attribute_name of Object.keys(actor.data.data.attributes || {}) ) {

    // Insert attribute label
    if (typeof actor.data.data.attributes[attribute_name].label === 'undefined') {
      updateData[`data.attributes.${attribute_name}.label`] = attributes[attribute_name].label;
    }
    for ( let skill_name of Object.keys(actor.data.data.attributes[attribute_name]['skills']) ) {

      // Insert skill label
      // Copy Skill value
      if (typeof actor.data.data.attributes[attribute_name].skills[skill_name].label === 'undefined') {

        // Create Label.
        updateData[`data.attributes.${attribute_name}.skills.${skill_name}.label`] = attributes[attribute_name].skills[skill_name].label;
        // Migrate from skillname = [0]
        let skill_tmp = actor.data.data.attributes[attribute_name].skills[skill_name];
        if (Array.isArray(skill_tmp)) {
          updateData[`data.attributes.${attribute_name}.skills.${skill_name}.value`] = [skill_tmp[0]];
        }
        
      }
    }
  }

  // Migrate Stress to Array
  if (typeof actor.data.data.stress[0] !== 'undefined') {
    updateData[`data.stress.value`] = actor.data.data.stress;
    updateData[`data.stress.max`] = 9;
    updateData[`data.stress.max_default`] = 9;
    updateData[`data.stress.name_default`] = "BITD.Stress";
    updateData[`data.stress.name`] = "BITD.Stress";
  }

  // Migrate Trauma to Array
  if (typeof actor.data.data.trauma === 'undefined') {
    updateData[`data.trauma.list`] = actor.data.traumas;
    updateData[`data.trauma.value`] = [actor.data.traumas.length];
    updateData[`data.trauma.max`] = 4;
    updateData[`data.trauma.max_default`] = 4;
    updateData[`data.trauma.name_default`] = "BITD.Trauma";
    updateData[`data.trauma.name`] = "BITD.Trauma";
  }

  // Migrate character playbook
  if (typeof actor.data.data.playbook === "undefined" || actor.data.data.playbook === ""){
    console.log("No playbook set");
    let old_playbook = actor.data.items.find(item => {
      return item.type === "class";
    });
    console.log("Old playbook:", old_playbook);
    if(typeof old_playbook != "undefined"){
      let playbooks_content = await BladesHelpers.getSourcedItemsByType("class");
      updateData[`data.playbook`] = playbooks_content.find(pb => pb.name === old_playbook.name)._id;
      let existing_abilities = actor.items.filter(item => item.type === "ability");
      for (const existingAbility of existing_abilities) {
        await existingAbility.update({data : { purchased : true } });
      }
      await actor.addPlaybookAbilities(old_playbook.name);

      // Migrate character playbook items
      await actor.addPlaybookItems(old_playbook.name);

      // Migrate character generic items
      await actor.addGenericItems();

      // Add default character NPCs
      await actor.addPlaybookAcquaintances(old_playbook.name);
      if (typeof actor.data.data.heritage === "undefined" || actor.data.data.heritage === "" || actor.data.data.heritage === "Heritage") {
        let old_heritage = actor.data.items.find(item => {
          return item.type === "heritage";
        });
        if (typeof old_heritage != "undefined") {
          updateData[`data.heritage`] = old_heritage.name;
        }
      }

      if (typeof actor.data.data.background === "undefined" || actor.data.data.background === "" || actor.data.data.background === "Background") {
        let old_background = actor.data.items.find(item => {
          return item.type === "background";
        });
        if (typeof old_background != "undefined") {
          updateData[`data.background`] = old_background.name;
        }
      }

      if (typeof actor.data.data.vice === "undefined" || actor.data.data.vice === "" || actor.data.data.vice === "Vice") {
        let old_vice = actor.data.items.find(item => {
          return item.type === "vice";
        });
        if (typeof old_vice != "undefined") {
          updateData[`data.vice`] = old_vice.name;
        }
      }

    }
    else{
      ui.notifications.info(`No playbook/class item found. Please select a class manually via the dropdown`, {permanent: true});
    }
  }

  console.log("fixing acquaintances")
  //fix the fact that you're not using _id in the acquaintances array anymore
  if(actor.data.data.acquaintances.length > 0){
    let fixed = actor.data.data.acquaintances.map(acq => {
      if("_id" in acq){
        acq.id = acq._id;
      }
      return acq;
    });
    // let diff = diffObject(actor.data.data.acquaintances, fixed);
    updateData["data.acquaintances"] = fixed;

  }


  return updateData;

  // for ( let k of Object.keys(actor.data.attributes || {}) ) {
  //   if ( k in b ) updateData[`data.bonuses.${k}`] = b[k];
  //   else updateData[`data.bonuses.-=${k}`] = null;
  // }
}

/* -------------------------------------------- */


/**
 * Make Token be an Actor link.
 * @param {Actor} actor   The actor to Update
 * @return {Object}       The updateData to apply
 */
function _migrateTokenLink(actor) {

  let updateData = {}
  updateData['token.actorLink'] = true;

  return updateData;
}

/* -------------------------------------------- */