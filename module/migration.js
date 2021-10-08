export async function migrateActorsTrauma() {
  //figure out how to migrate the old trauma storage over to a pure list. The thing below isn't really doing anything yet.
  function _migrateTrauma(data) {
    let arrayList;
    if(Array.isArray(data.data.trauma.list)) {
      arrayList = data.data.trauma.list;
    }
    //if the current list isn't an array (it's an object, the old style), convert it to an array of the "owned" traumas
    else{
      let objectList = data.data.trauma.list;
      arrayList = Object.keys(objectList).filter(key => objectList[key]);
    }
    //then make sure the array list is localized string keys. Not necessarily valid ones, mind you.
    arrayList = arrayList.filter(item=> item || typeof item !== "undefined").map((item)=>{
      if(item.startsWith("BITD.Trauma")){
        return item;
      }
      else{
        return `BITD.Trauma${item.charAt(0).toUpperCase() + item.slice(1)}`;
      }
    });
    
    let newTraumaListData = {"data.trauma.list" : arrayList};
    newTraumaListData["data.trauma.options"] = ["BITD.TraumaCold", "BITD.TraumaHaunted", "BITD.TraumaObsessed", "BITD.TraumaParanoid", "BITD.TraumaReckless", "BITD.TraumaSoft", "BITD.TraumaUnstable", "BITD.TraumaVicious"];
    newTraumaListData = expandObject(newTraumaListData);
    return newTraumaListData;
  }

  for ( let a of game.actors.contents ) {
    if (a.data.type === 'character') {
      try {
        const updateData = _migrateTrauma(a.data);
        if ( !isObjectEmpty(updateData) ) {
          console.log(`Migrating trauma for Actor ${a.name}`);
          await a.update(updateData, {enforceTypes: false});
        }
      } catch(err) {
        console.error(err);
      }
    }
  }
  game.settings.set("bitd", "systemMigrationVersion", game.system.data.version);
  ui.notifications.info(`BITD Actor Trauma Migration to version ${game.system.data.version} completed!`, {permanent: true});
}

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
        const updateData = _migrateActor(a.data);
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
function _migrateActor(actor) {

  let updateData = {}

  // Migrate Skills
  const attributes = game.system.model.Actor.character.attributes;
  for ( let attribute_name of Object.keys(actor.data.attributes || {}) ) {

    // Insert attribute label
    if (typeof actor.data.attributes[attribute_name].label === 'undefined') {
      updateData[`data.attributes.${attribute_name}.label`] = attributes[attribute_name].label;
    }
    for ( let skill_name of Object.keys(actor.data.attributes[attribute_name]['skills']) ) {

      // Insert skill label
      // Copy Skill value
      if (typeof actor.data.attributes[attribute_name].skills[skill_name].label === 'undefined') {

        // Create Label.
        updateData[`data.attributes.${attribute_name}.skills.${skill_name}.label`] = attributes[attribute_name].skills[skill_name].label;
        // Migrate from skillname = [0]
        let skill_tmp = actor.data.attributes[attribute_name].skills[skill_name];
        if (Array.isArray(skill_tmp)) {
          updateData[`data.attributes.${attribute_name}.skills.${skill_name}.value`] = [skill_tmp[0]];
        }
        
      }
    }
  }

  // Migrate Stress to Array
  if (typeof actor.data.stress[0] !== 'undefined') {
    updateData[`data.stress.value`] = actor.data.stress;
    updateData[`data.stress.max`] = 9;
    updateData[`data.stress.max_default`] = 9;
    updateData[`data.stress.name_default`] = "BITD.Stress";
    updateData[`data.stress.name`] = "BITD.Stress";
  }

  // Migrate Trauma to Array
  if (typeof actor.data.trauma === 'undefined') {
    updateData[`data.trauma.list`] = actor.data.traumas;
    updateData[`data.trauma.value`] = [actor.data.traumas.length];
    updateData[`data.trauma.max`] = 4;
    updateData[`data.trauma.max_default`] = 4;
    updateData[`data.trauma.name_default`] = "BITD.Trauma";
    updateData[`data.trauma.name`] = "BITD.Trauma";
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