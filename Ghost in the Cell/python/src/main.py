import sys
import math
import time


#this is a tests x2

def debug(statement):
    print(statement, file=sys.stderr, flush=False)


def logTimeStats():
    totalTime = 0
    for function in timeLog:
        totalTime += timeLog[function]['time']
        if timeLog[function]['time'] < .01:
            pass
            #debug(function + " was not an issue")
        else:
            debug("in total, " + function + " ran " + str(timeLog[function]['iters']) + " time(s) and spent " + str(timeLog[function]['time']) + ' seconds running')
    debug('totalTime: ' + str(totalTime))

def beginTimer(name):
    if not timeLog.get(name):
        timeLog[name] = {"time": 0, "iters":0}

    timeLog[name]["runTimer"] = time.time()

def endTimer(name, shouldIncrement):
    timeElapsed = time.time() - timeLog[name]['runTimer']
    #debug('set timeline took ' + str(timeElapsed))
    timeLog[name]['time'] += timeElapsed
    if shouldIncrement:
        timeLog[name]["iters"] += 1



factory_ds_dict = {}
factory_ds = []

factory_count = int(input())  # the number of factories
link_count = int(input())  # the number of links between factories
for i in range(link_count):
    factory_1, factory_2, distance = [int(j) for j in input().split()]
    #debug(factory_1)
    if not factory_ds_dict.get(factory_1):
        factory_ds_dict[factory_1] = {}
    
    if not factory_ds_dict.get(factory_2):
        factory_ds_dict[factory_2] = {}

    factory_ds_dict[factory_1][factory_2] = distance
    factory_ds_dict[factory_2][factory_1] = distance
    
    
    factory_ds.append({"f1": factory_1, "f2":factory_2, "distance":distance})

# game loop

def set_timeline(fact, troops, my_Bombs,  dist = 0): ## Need to figure out how many troops to keep 
    beginTimer("set_timeline", )
    timeline = []

    # This is the timeline where I end up with the factory 
    # TODO Support timeline for TAKING factory as well
    alteredTimeline = [] 

    filteredTroops = list(filter(lambda x:  x['target']==fact['name'],list(troops)))
    # if(fact['name'] == 6):
    #     print('the following troops are set to attack 6', file=sys.stderr, flush=False)
    #     print(filteredTroops, file=sys.stderr, flush=False)
        
    
    #instantiate what the factory is at right now
    timeline.append({'troops':fact['troops'], 'alliance':fact['alliance'], "productionOff":fact['productionOff']})
    alteredTimeline.append({'troops':fact['troops'], 'alliance':fact['alliance'], 'extraTroopsNeeded':0, 'totalTroopsNeeded': 0})
    for i in range(20): #when i == 1 we are talking about next turn
        frame = i+1
        #Start by assuming nothing has changed between i turn and i+1 turn
        newTimelineTurn = {"troops": timeline[i]['troops'], 'alliance':timeline[i]['alliance'], 'productionOff':timeline[i]['productionOff']-1}
        alteredTimelineTurn = {"troops": alteredTimeline[i]['troops'], 'alliance':alteredTimeline[i]['alliance'], 'extraTroopsNeeded':alteredTimeline[i]['extraTroopsNeeded'], 'totalTroopsNeeded':alteredTimeline[i]['totalTroopsNeeded'], 'productionOff':timeline[i]['productionOff']-1}
        #calculate production if not neutral
        if newTimelineTurn['alliance'] != 0 and newTimelineTurn['productionOff'] <= 0:
            newTimelineTurn['troops'] += fact['production']
        if alteredTimelineTurn['alliance'] != 0 and alteredTimelineTurn['productionOff'] <= 0:
            alteredTimelineTurn['troops'] += fact['production']
        #add troops arriving this turn
        for troop in filteredTroops:
            if troop['ETA'] == frame: #no OBO because troops take a minimum of one turn to arrive, and frame starts at 1
                #if troops match factory, simply sum them up
                
                if troop['alliance'] == newTimelineTurn['alliance']:
                    newTimelineTurn['troops'] += troop['number']
                
                else: #if troops differ from factory, 
                    #if there aren't enough troops to take it, subtract them out
                    if troop['number']<=newTimelineTurn['troops']:
                        newTimelineTurn['troops'] -= troop['number']
                    else: 
                        #factory was over taken
                        #set new troops and new allegiance
                        #This should be able to handle even if multiple different troops arrive at the same time because of commutative property of addition and subtraction
                        newTimelineTurn['troops'] = troop['number'] - newTimelineTurn['troops']
                        newTimelineTurn['alliance'] = troop['alliance']
                if troop['alliance'] == alteredTimelineTurn['alliance']:
                    alteredTimelineTurn['troops'] += troop['number']
                    #TODO add this back in, as long as we don't take away troops
                    #TODO alright, sit down and figure this crap out.
                    #alteredTimelineTurn['totalTroopsNeeded'] -= troop['number'] #we got reinforcements, need less future troops
                else:
                    #if troops differ from factory, 
                    alteredTimelineTurn['totalTroopsNeeded'] += troop['number'] #enemies came, gonna need more troops
                    #if there aren't enough troops to take it, subtract them out
                    if troop['number']<=alteredTimelineTurn['troops']:
                        alteredTimelineTurn['troops'] -= troop['number']
                    else: 
                        ## In the altered timeline we pretend that we already sent enough soldiers to hold it
                        ## this means that troops set to 0, and extraTroopsNeeded = old extraTroopsNeeded + incoming troops-currentTroops
                        alteredTimelineTurn['extraTroopsNeeded'] = alteredTimelineTurn['extraTroopsNeeded'] + (troop['number'] - alteredTimelineTurn['troops'])
                        alteredTimelineTurn['troops'] = 0

        for bomb in my_Bombs:                                                    
            if bomb['ETA'] == frame and bomb['target'] == fact['name']:
                newTimelineTurn['productionOff'] = 5
                alteredTimelineTurn['productionOff'] = 5
                
                if newTimelineTurn['troops'] <= 20: ## if there are 20 or less, 10 will be destroyed
                    newTimelineTurn['troops'] = max(0, newTimelineTurn['troops']-10)
                else: ## there are more than 20, half will be destroyed rounded down
                    newTimelineTurn['troops'] = (newTimelineTurn['troops']+1)//2

                if alteredTimelineTurn['troops'] <= 20:
                    alteredTimelineTurn['troops'] = max(0, alteredTimelineTurn['troops']-10)
                else: 
                    alteredTimelineTurn['troops'] = (alteredTimelineTurn['troops']+1)//2
        timeline.append(newTimelineTurn)
        alteredTimeline.append(alteredTimelineTurn)
    # if fact['name'] == 1:
    #     print(timeline, file=sys.stderr, flush=False)
    #     print(alteredTimeline, file=sys.stderr, flush=False)

    endTimer("set_timeline", True)
    return {'timeline':timeline, 'alteredTimeline':alteredTimeline}


def get_bomb(my_Factories, bombsLeft): ##TODO use timeline to not bomb self
    ##TODO use timeline to think about when bomb will get there and what the situation will be
    beginTimer("get_bomb")
    if(bombsLeft <= 0):
        endTimer("get_bomb", 1)
        return ''
    if len(my_Factories) == 0:
        endTimer("get_bomb", 1)
        return ''
    for factToBomb in factories:
        bomberFactory = get_Closest_Factory(fact, my_Factories, 1)
        dist = get_distance(bomberFactory, factToBomb)
        if factToBomb['timeline'][dist]['alliance'] == -1 and factToBomb['bombed'] != True and factToBomb["production"] == 3:
        # if fact['troops'] - fact['targeted'] > 0 and fact['bombed'] != True and fact["production"] == 3:
            bombsLeft -= 1
            endTimer("get_bomb", 1)
            return 'BOMB '+ str(bomberFactory['name']) + " " + str(factToBomb["name"]) + ';'
    endTimer("get_bomb", 1)
    return ''

def get_distance(source, target):
    beginTimer("get_distance")
    #debug(factory_ds_dict[source['name']][target['name']])
    if source == target:
        endTimer("get_distance", 1)
        return 0

    distance = factory_ds_dict[source['name']][target['name']]

    # for link in factory_ds:
    #     if link['f1'] == source['name'] and link['f2'] == target['name'] or link['f1'] == target['name'] and link['f2'] == source['name']:
    #         distance = link['distance']
    endTimer("get_distance", 1)
    return distance

def is_backline(source):
    beginTimer("is_backline")

    allianceToCheck = source['alliance']
    if (allianceToCheck == 0):
        endTimer("is_backline", 1)
        return False #Neutral factories can't be backline
        ## Posibly neutral factories should be considered backline if behind enemy factories, instead of neutral ones? 
    for possibleFrontline in factories:
        if (is_behind(source, possibleFrontline)):
            # if (source['name'] == 1):
                # debug(possibleFrontline['name'])
            #Totally eclipsed by at least one factory
            endTimer("is_backline", 1)
            return True
    
    #not eclipsed by any factory
    endTimer("is_backline", 1)
    return False

def is_behind(source, target, targetToCheck = False):
    beginTimer("is_behind")

    if(target['name'] == source['name']):
        #can't be behind myself
        endTimer("is_behind", 1)
        return False
    allianceToCheck = source['alliance']
    if target['alliance'] != allianceToCheck:
        #Two factories need to belong to the same player for 'behind' to be applicable
        endTimer("is_behind", 1)
        return False
    if targetToCheck == False:
        for opposingFactory in factories:
            if opposingFactory['alliance'] == allianceToCheck or opposingFactory['alliance'] == 0:
                #not an opposing factory
                continue
            if get_distance(source, opposingFactory) < get_distance(target, opposingFactory):
                #I am closer to at least one factory, not behind
                endTimer("is_behind", 1)

                return False
    elif get_distance(source, targetToCheck) <= get_distance(target, targetToCheck):
        #I am closer to the factory
        endTimer("is_behind", 1)
        return False
        
    endTimer("is_behind", 1)
    return True

def get_links_to_factory(target):
    beginTimer("get_links_to_factory")
    factoryLinks = []

    for link in factory_ds:
        if link["f1"] == target["name"] or link["f2"] == target["name"]:
            # if (target['name'] == 0):
            #     debug(link)
            factoryLinks.append(link)

    endTimer("get_links_to_factory", 1)
    return factoryLinks

def sum_of_troops_in_range_of_target(target, distance, alliance, includeTarget = True): #TODO doesn't work for neutrals very well
    ##TODO think about production of factories closer than range to make an event horizon?
    beginTimer("sum_of_troops_in_range_of_target")

    otherName = ""
    other = {}
    troopSum = 0
    if includeTarget and target["alliance"] == alliance:
        troopSum += target["troops"]
    for link in get_links_to_factory(target):
        if link["f1"] == target["name"]:
            otherName = link["f2"]
        if link["f2"] == target["name"]:
            otherName = link["f1"]

        for factory in factories:
            if factory["name"] == otherName:
                other = factory
        
        if link["distance"] <= distance: ##Careful of OBO here
            # if(target["name"] == 10 and other["name"] == 2):
            #     debug("distance from 2: " + str(link['distance']))
            if other["alliance"] == alliance:
                troopSum += other["troops"] + other["production"] * (distance - link["distance"])
        
        for troop in troops:
            if troop['target'] == other['name']:
                if troop['ETA'] + link['distance'] <= distance: #Careful of OBO'
                    if troop['alliance'] == alliance:
                        troopSum += troop['number']
                    else:
                        ## TODO:J should we be subtracting?????
                        pass

    endTimer("sum_of_troops_in_range_of_target", 1)
    return troopSum
            

def get_Closest_Factory(target, factories, favorAlliance = -1,):
    beginTimer("get_Closest_Factory")
    returnFactory = {}
    minDistance = 20
    distance = 0
    for factory in factories:
        if (factory['name'] == target['name']): #factory is me, no distance
            continue
        distance = get_distance(target, factory)
        if distance < minDistance or (distance == minDistance and factory['alliance'] == favorAlliance):
            minDistance = distance
            returnFactory = factory

    endTimer("get_Closest_Factory", 1)
    return returnFactory
    
def get_Average_Distance(target, factories, allianceToCheck):
    beginTimer("get_Average_Distance")

    averageDistance = 0
    sumDistance = 0
    allianceFactCount = 0
    for factory in factories:
        if (factory['name'] == target['name']): #factory is me, no distance
            continue
        if (factory['alliance'] == allianceToCheck):
            sumDistance += get_distance(target, factory)
            allianceFactCount += 1

    averageDistance = sumDistance/allianceFactCount
        
    endTimer("get_Average_Distance", 1)
    return averageDistance



##TODO
## create value functions for attacking, repositioning, and incrementing
## for each node, evaluate my desire to do any of those things to any other node
## if we have enough troops to do the most desired thing, do it and repeat
## else, wait
def get_attack_desireability(source, target):
    beginTimer("get_attack_desireability")


    
    ## min troops allowed is antiquated because I should be willing to sacrifice myself for something more valuable
    ## TODO replace this with better evaluation function
    minTroopsAllowed = max(0, source['alteredTimeline'][-1]['totalTroopsNeeded'])
    middleMan = target
    distanceConstant = .2
    for factory in my_Factories:
        if (is_behind(source, factory, target)):
            if (get_distance(source, target) <= distanceConstant * (get_distance(source, factory) + get_distance(factory, target))):
                middleMan = factory
    ## Send or keep enough troops so that when all is said and done, the factory is mine
    ##d = source['troops'] -100 This is code to make sure I do something when my factories have too many peeps.  outdated, I think
    d = 0
    distance = get_distance(source, target)

    troopsICanSpare = source["troops"] - minTroopsAllowed

    troopsNeededToTakeIt = 0
    troopsNeededToTakeItFromFriends = 0

    # if (source["isBackline"]): ##TODO maybe reinstate this but only if target is enemy
    #     #Backline movement will be handled by repositioning
    #     return {"desireability":d, "troops":0}
    
    if (target["isBackline"] and target["alliance"] != 1):
        #Backline never attack not frontline because good players will just block
        endTimer("get_attack_desireability", 1)
        return {"desireability":d, "troops":0}

    if target['timeline'][distance+1]['alliance'] != 1: 
        troopsNeededToTakeIt = target['timeline'][distance+1]['troops']+1 
        troopsNeededToTakeItFromFriends = troopsNeededToTakeIt + sum_of_troops_in_range_of_target(target, distance, -1, False)
    
    if target['timeline'][distance+1]['alliance'] == 0 and target['production'] == 0: 
        #neutral and no production, don't attack, just reposition
        endTimer("get_attack_desireability", 1)
        return {"desireability":d, "troops":0}

    troopsNeededToUpgradeIt = troopsNeededToTakeItFromFriends+9 #TODO check for obo #TODO unused
    troopsToSend = max(troopsNeededToTakeItFromFriends, 0)
    
    # if(source['name'] == 4 and target['name'] == 2):
    #     debug("troopsNeededToTakeItFromFriends to take 2: " + str(troopsNeededToTakeItFromFriends))
    #     debug("troopsToSend to take 2: " + str(troopsToSend))
    #     debug("desire to take 2: " + str(d))
    #     debug("distance from 4 to 2: " + str( get_distance(source, target)))
    #     debug("current troops at target: " + str(target["troops"]))
    #     debug("production from now to then: " + str(target["production"]*(distance+1)))
    #     debug("troops needed to take it straight out: " + str(troopsNeededToTakeIt))
    #     debug("friends in range: " + str(sum_of_troops_in_range_of_target(target, distance, -1, False)))

    if (troopsNeededToTakeItFromFriends > troopsICanSpare): ## Dont have enough force to take it, don't bother
        if (d > 1):
            print('warning, don\'t have enough troops, but sending anyway', file=sys.stderr, flush=False)
        endTimer("get_attack_desireability", 1)
        return {"desireability":d, "troops":0}
    if troopsNeededToTakeItFromFriends <= 0: ## HAve too much force, don't bother
        endTimer("get_attack_desireability", 1)
        return {"desireability":d, "troops":0}
    
    #Double if belonging to the opponent
    value = target['production']
    if target['alliance'] == -1:
        value *= 2

    d = (max(value, .3)/(target['troops']+1+distance))*100 #100 is the base value

    if (troopsNeededToTakeItFromFriends <= troopsICanSpare): #lets lock this down
        troopsToSend = troopsNeededToTakeItFromFriends 

    

    endTimer("get_attack_desireability", 1)
    return {"desireability":d, "troops":max(0,troopsToSend), "target": middleMan}



def get_reposition_desireability(source, target):
    beginTimer("get_reposition_desireability")

    ##TODO think about strategically repositioning, right now we only reposition for upgrades
    distance = get_distance(source, target)

    if (target['timeline'][distance+2]['alliance'] == -1 or (target['timeline'][distance+2]['alliance'] == 0 and target['production'] != 0)): # can't reposition somewhere my enemy owns
        endTimer("get_reposition_desireability", 1)
        return {"desireability":0, "troops":0}
    minTroopsRequired = max(0, target['alteredTimeline'][-1]['totalTroopsNeeded'])

        

    troopsNeededToUpgrade = 0

    if target['alliance'] == 1: #TODO:J unify this
        troopsNeededToUpgrade = 10-max(minTroopsRequired, target['alteredTimeline'][distance+2]['troops']) #+2 because the frame it arrives will produce as well
        if(troopsNeededToUpgrade  <= 0): ## help us upgrade a second time ##TODO rethink this
            troopsNeededToUpgrade = 20-max(minTroopsRequired, target['alteredTimeline'][distance+2]['troops']) #+2 because the frame it arrives will produce as well
    if target['alliance'] == 0:
        troopsNeededToUpgrade = 10-(target['timeline'][distance+2]['troops']) #+2 because the frame it arrives will produce as well



    minTroopsAllowed = max(0, source['alteredTimeline'][-1]['totalTroopsNeeded']) #TODO we should do some of these calculations once and store them in the factory
    troopsICanSpare = source["troops"] - minTroopsAllowed

    if troopsICanSpare >= troopsNeededToUpgrade + 10 and target['production']<2:
        troopsNeededToUpgrade += 10
    elif troopsICanSpare >= troopsNeededToUpgrade + 20 and target['production']<1:
        troopsNeededToUpgrade += 20

    d = get_Upgrade_Desireability(target)-distance
    t = troopsNeededToUpgrade

    # if(source['name'] == 1 and target['name'] == 11):
    #     # debug(target['timeline'])
    #     # debug(target['alteredTimeline'])
    #     debug("desireability for 11: " + str(d))
    #     debug("troops for 11: " + str(t))
    #     debug("troopsNEededToUpgrade 11: " + str(troopsNeededToUpgrade))
    #     debug("troopsICanSpare 11: " + str(troopsICanSpare))


    if (troopsICanSpare < troopsNeededToUpgrade): 
        #cannot upgrade, abort
        t = minTroopsRequired
        if (troopsICanSpare < minTroopsRequired):## TODO I think this case is supposed to be handled by my attack function
            endTimer("get_reposition_desireability", 1)
            return {"desireability":0, "troops":0}
    
    if (source['isBackline']):
        #if backline has nothing better to do, just offload units
        #TODO be more strategic about where to send units
        
        
        if(is_behind(source, target) and troopsICanSpare > 0):
            #don't send troops further away
            #desireability needs to be more than 1 and less than 10 and also sort by distance
            #TODO make this more compatable with new function
            d = 2 - (distance/21)
            t = troopsICanSpare

    if (t < 0):
        # can't send negative troops
        # TODO we shouldn't have been trying, fix this??
        endTimer("get_reposition_desireability", 1)
        return {"desireability":0, "troops":0}

    endTimer("get_reposition_desireability", 1)
    return {"desireability": d, "troops": t}




def get_Upgrade_Desireability(source):
    beginTimer("get_Upgrade_Desireability")

    if (source['production'] == 3): # we are already upgraded max
        endTimer("get_Upgrade_Desireability", 1)
        return 0
    if (source['alliance'] ==1 and source['alteredTimeline'][-1]['extraTroopsNeeded'] > 0): #try not to upgrade factories that are about to be taken
        endTimer("get_Upgrade_Desireability", 1)
        return 0

    closestFactory = get_Closest_Factory(source, factories, -1)

    


    if closestFactory['alliance'] == -1:  ##TODO hogwash, we're better than this
        closestFriend = get_Closest_Factory(source, factories, 1)
        distanceToClosestFriend = get_distance(source, closestFriend)
        enemyTroopsInRange = sum_of_troops_in_range_of_target(source,distanceToClosestFriend, -1, False )
        if(enemyTroopsInRange > source['troops']-10): #TODO to safe bc not taking into account timelin
            endTimer("get_Upgrade_Desireability", 1)    
            return 0

    desireability = (1/10)*100 #This evaluates to 10, but I wanna show that its the same formula as the other
    
    endTimer("get_Upgrade_Desireability", 1)
    return desireability
    

def build_Attack_String(source, target, troops):
    beginTimer("build_Attack_String")
    if str(source) == str(target):
        endTimer("build_Attack_String")
        return ''
    endTimer("build_Attack_String", 1)
    return "MOVE " + str(source) + " " + str(target) + " " + str(troops) + ';'

def build_upgrade_string(source):
    beginTimer("build_upgrade_string")
    endTimer("build_upgrade_string", 1)
    return "INC " + str(source) + ';'


factories = []
bombsLeft = 2
while True:
    timeLog = {}
    troops = []
    my_Bombs = []
    entity_count = int(input())  # the number of entities (e.g. factories and troops)
    for i in range(entity_count):
        inputs = input().split()
        entity_id = int(inputs[0])
        entity_type = inputs[1]
        arg_1 = int(inputs[2])
        arg_2 = int(inputs[3])
        arg_3 = int(inputs[4])
        arg_4 = int(inputs[5])
        arg_5 = int(inputs[6])


        if entity_type == "FACTORY":
           
            factFound = False
            for fact in factories:
                if fact['name'] == entity_id:
                    factFound = True
                    fact['production'] = max(fact['production'], arg_3) ##only rewrite production if it is greater
                    fact["alliance"] = arg_1
                    fact["isBackline"] = is_backline(fact)
                    fact["troops"] = arg_2 
                    if fact["productionOff"]>0:
                        fact['productionOff'] -= 1
                    if (arg_4 > 0):
                        fact["productionOff"] = arg_4
            if not factFound:
                #TODO Targeted doesn't seem to be properly implemented
                newFactory = {"alliance":arg_1, "name": entity_id, "troops": arg_2, "production": arg_3, "targeted":0, "desireability":0, "bombed": False, "productionOff":0}
                newFactory["isBackline"] = is_backline(newFactory)
                factories.append(newFactory)
        elif entity_type == "TROOP":
            troops.append({"alliance":arg_1, "target":arg_3, "number":arg_4, "ETA": arg_5})


        elif entity_type == "BOMB":
            if arg_1 == 1:
                my_Bombs.append({"target":arg_3, "ETA":arg_4})
            ## TODO guess the targets of my enemies bombs, and rule out factories that are closer to the inception than the time elapsed

    # for troop in troops:
    #     if troop["target"] == 3 and troop["ETA"] <= 2:
    #         debug(troop)

    for fact in factories:
        storageObject = set_timeline(fact, troops, my_Bombs)
        fact['alteredTimeline'] = storageObject['alteredTimeline']
        fact['timeline'] = storageObject['timeline']
        fact['bombed'] = False
        for bomb in my_Bombs:
            if bomb['target'] == fact['name']:
                fact['bombed'] = True #TODO mark this on the timeline so we can lock a foctory out
            

    source = 'null'
    dest = 'null'

    ## pardon the list list situation, its to help get a shallow copy
    my_Factories = list(filter(lambda x: x['alliance'] == 1,list(factories)))
    enemy_Factories = list(filter(lambda x: x['alliance'] == -1,list(factories)))

    commandString = ''
    numIters = 3 - math.floor(len(my_Factories)/5)
    for i in range(numIters): #TODO crashing from too much thinking
        for fFact in my_Factories:
            upgradeDesireability = get_Upgrade_Desireability(fFact)
            highD = upgradeDesireability
            target = 'null'
            numTroops = 0
            command = "upgrade"
            for fFact2 in factories:
                if fFact['name'] == fFact2['name']: ## factory looking at itself, abort
                    ## TODO actually it might be wise to think like this.  Would enable us to sacrifice
                    continue
                # if(fFact['name'] == 1):
                #     debug(fFact2['name'])
                stats = get_attack_desireability(fFact, fFact2)
                if stats["desireability"] > highD:
                    highD = stats["desireability"]
                    target = stats['target']
                    numTroops = stats["troops"]
                    command = 'attack'
                repoStats = get_reposition_desireability(fFact, fFact2)
                if repoStats["desireability"] > highD:
                    highD = repoStats["desireability"]
                    target = fFact2
                    numTroops = repoStats["troops"]
                    command = 'reposition'


            if target != 'null' and highD > 1: # attack is happening, edit timeline and build command
                # if(fFact['name'] == 1):
                #     debug('executing')
                commandString += build_Attack_String(fFact["name"], target["name"], numTroops)
                fFact['troops'] -= numTroops
                troops.append({"alliance":1, "target":target["name"], "number":numTroops, "ETA": get_distance(fFact, target)})
                storageObject = set_timeline(target, troops, my_Bombs)
                target['alteredTimeline'] = storageObject['alteredTimeline']
                target['timeline'] = storageObject['timeline']
            elif highD > 1: # updgrade is happening, edit timeline and build command
                if (fFact['troops'] >= 10):
                    commandString += build_upgrade_string(fFact["name"])
                    fFact['troops'] -= 10 #cost to upgrade
                    fFact['production'] += 1
                    #Shouldn't need to recreate timeline, becuase the timeline should already be fine?
                else:
                    #Do nothing, upgrade is the best next thing, but we don't want to yet.
                    pass
 

 

                
    # commandString += get_upgrade(my_Factories)
    shouldBomb = get_bomb(my_Factories, bombsLeft)
    if (shouldBomb != ''):
        bombsLeft -= 1
    commandString += shouldBomb
            

    commandString = commandString[:-1] #strip the last semi colon
    
    logTimeStats()

    if commandString == '':
        commandString = "WAIT"
    print(commandString)