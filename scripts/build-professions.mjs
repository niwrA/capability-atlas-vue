import { readDataset, writeDataset } from './atlas-data.mjs'
import { applyCleaningSafetyKnowledge } from './profession-cleaning-safety-knowledge.mjs'
import { applyCleaningControls } from './profession-cleaning-controls.mjs'
import { applyLinenServices } from './profession-linen-services.mjs'
import { applyRoomCleaning } from './profession-room-cleaning.mjs'
import { applyToiletServices } from './profession-toilet-services.mjs'
import { applyLinenRoomAttendant, applyRoomAttendant, applyToiletAttendant } from './profession-hospitality-cleaning-profiles.mjs'
import { applySpecialistCleaningFoundations } from './profession-cleaning-specialist-foundations.mjs'
import { applyKitchenSupport } from './profession-kitchen-support.mjs'
import { applyTrainCleaning } from './profession-train-cleaning.mjs'
import { applyKitchenPorter, applyTrainCleaner } from './profession-kitchen-train-profiles.mjs'
import { applyFurnitureFoundations } from './profession-furniture-foundations.mjs'
import { applyFurnitureMethods } from './profession-furniture-methods.mjs'
import { applyFurnitureCleaner } from './profession-furniture-cleaner.mjs'
import { applyTextileCareKnowledge } from './profession-textile-care-knowledge.mjs'
import { applyCleaningCareServices } from './profession-cleaning-care-services.mjs'
import { applyTextileCleaningMethods } from './profession-textile-cleaning-methods.mjs'
import { applyDraperyCarpetCleaner } from './profession-drapery-carpet-cleaner.mjs'
import { applyWindowRiskAccess } from './profession-window-risk-access.mjs'
import { applyCleaningReportingWaste } from './profession-cleaning-reporting-waste.mjs'
import { applyWindowMethods } from './profession-window-methods.mjs'
import { applyWindowCleaner } from './profession-window-cleaner.mjs'
import { applyVehicleKnowledge } from './profession-vehicle-knowledge.mjs'
import { applyVehicleWorkControls } from './profession-vehicle-work-controls.mjs'
import { applyVehicleSurfaces } from './profession-vehicle-surface-methods.mjs'
import { applyVehicleSpecialCare } from './profession-vehicle-special-care.mjs'
import { applyVehicleCleaner } from './profession-vehicle-cleaner.mjs'
import { applyBuildingSiteControls } from './profession-building-site-controls.mjs'
import { applyBuildingAssessment } from './profession-building-assessment.mjs'
import { applyBuildingExteriorMethods } from './profession-building-exterior-methods.mjs'
import { applyBuildingExteriorCleaner } from './profession-building-exterior-cleaner.mjs'
import { applyCaretakerGovernance } from './profession-caretaker-governance.mjs'
import { applyBuildingManagement } from './profession-building-management.mjs'
import { applyCaretakerMaintenance } from './profession-caretaker-maintenance.mjs'
import { applyBuildingCaretaker } from './profession-building-caretaker.mjs'
import { applyTelephonyFoundations } from './profession-telephony-foundations.mjs'
import { applyTelephonyConnections } from './profession-telephony-connections.mjs'
import { applyTelephonyMaintenance } from './profession-telephony-maintenance.mjs'
import { applySwitchboardOperator } from './profession-switchboard-operator.mjs'
import { applyOfficeSuite } from './profession-office-suite.mjs'
import { applyOfficeCommunications } from './profession-office-communications.mjs'
import { applyOfficeGovernance } from './profession-office-governance.mjs'
import { applyReceptionOperations } from './profession-reception-operations.mjs'
import { applyReceptionist } from './profession-receptionist.mjs'
import { applyDataKnowledge } from './profession-data-knowledge.mjs'
import { applyRdfQueryKnowledge } from './profession-rdf-query-knowledge.mjs'
import { applyDataAnalysis } from './profession-data-analysis.mjs'
import { applyDataSecurity } from './profession-data-security.mjs'
import { applyDataEntryMethods } from './profession-data-entry-methods.mjs'
import { applyWordProcessing } from './profession-word-processing.mjs'
import { applyDataEntryClerk } from './profession-data-entry-clerk.mjs'
import { applyOfficeFoundations } from './profession-office-foundations.mjs'
import { applyStatutoryRecords } from './profession-statutory-records.mjs'
import { applyCommunicationFoundations } from './profession-communication-foundations.mjs'
import { applyCorporateInformation } from './profession-corporate-information.mjs'
import { applyOfficeDocuments } from './profession-office-documents.mjs'
import { applyOfficeRecords } from './profession-office-records.mjs'
import { applyOfficeAnalysis } from './profession-office-analysis.mjs'
import { applyOfficeSystems } from './profession-office-systems.mjs'
import { applyOfficeMail } from './profession-office-mail.mjs'
import { applyOfficeEquipment } from './profession-office-equipment.mjs'
import { applyOfficeOperations } from './profession-office-operations.mjs'
import { applyAdministrativeAssistant } from './profession-administrative-assistant.mjs'
import { applyCustomerRecords } from './profession-customer-records.mjs'
import { applyWorkLiaison } from './profession-work-liaison.mjs'
import { applyPostalOperations } from './profession-postal-operations.mjs'
import { applyMailClerk } from './profession-mail-clerk.mjs'
import { applyGeographicWork } from './profession-geographic-work.mjs'
import { applyResponsibleWork } from './profession-responsible-work.mjs'
import { applyDataProtectionKnowledge } from './profession-data-protection-knowledge.mjs'
import { applyRoadUse } from './profession-road-use.mjs'
import { applyPostman } from './profession-postman.mjs'
import { applyFoodShelfLife } from './profession-food-shelf-life.mjs'
import { applyRetailStock } from './profession-retail-stock.mjs'
import { applyRetailMerchandise } from './profession-retail-merchandise.mjs'
import { applyShelfFiller } from './profession-shelf-filler.mjs'
import { applyWorkErgonomics } from './profession-work-ergonomics.mjs'
import { applyDomesticMethods } from './profession-domestic-methods.mjs'
import { applyDomesticCleaner } from './profession-domestic-cleaner.mjs'
import { applyBookkeepingKnowledge } from './profession-bookkeeping-knowledge.mjs'
import { applySalesOffice } from './profession-sales-office.mjs'
import { applySalesSupportAssistant } from './profession-sales-support-assistant.mjs'
import { applyManagerSupport } from './profession-manager-support.mjs'
import { applyOfficeSoftwareKnowledge } from './profession-office-software-knowledge.mjs'
import { applySupplyChainKnowledge } from './profession-supply-chain-knowledge.mjs'
import { applyFinancialNeeds } from './profession-financial-needs.mjs'
import { applySupplyChainAssistant } from './profession-supply-chain-assistant.mjs'
import { applyAccountManagement } from './profession-account-management.mjs'
import { applyFundraising } from './profession-fundraising.mjs'
import { applyFundraisingAssistant } from './profession-fundraising-assistant.mjs'
import { applyPromotionKnowledge } from './profession-promotion-knowledge.mjs'
import { applyPromotionMethods } from './profession-promotion-methods.mjs'
import { applyPromotionAssistant } from './profession-promotion-assistant.mjs'
import { applyDignityCare } from './profession-dignity-care.mjs'
import { applyFuneralMethods } from './profession-funeral-methods.mjs'
import { applyFuneralAttendant } from './profession-funeral-attendant.mjs'
import { applyMathematics } from './profession-mathematics.mjs'
import { applyEngineeringMethods } from './profession-engineering-methods.mjs'
import { applyResearchAssistance } from './profession-research-assistance.mjs'
import { applyEngineeringAssistant } from './profession-engineering-assistant.mjs'
import { applyStaffManagement } from './profession-staff-management.mjs'
import { applyManufacturingCoordination } from './profession-manufacturing-coordination.mjs'
import { applyClothingControl } from './profession-clothing-control.mjs'
import { applyClothingOperationsManager } from './profession-clothing-operations-manager.mjs'
import {applyTextileMaterials} from './profession-textile-materials.mjs'
import {applyWorkStandards} from './profession-work-standards.mjs'
import {applyTextileProcess} from './profession-textile-process.mjs'
import {applyTextileOperationsManager} from './profession-textile-operations-manager.mjs'
import {applyYarnMeasurement} from './profession-yarn-measurement.mjs'
import {applyApparelInspection} from './profession-apparel-inspection.mjs'
import {applyTextileLineQuality} from './profession-textile-line-quality.mjs'
import {applyTextileQualityManager} from './profession-textile-quality-manager.mjs'
import {applyNonwovenKnowledge} from './profession-nonwoven-knowledge.mjs'
import {applyTechnicalTextileSpecifications} from './profession-technical-textile-specifications.mjs'
import {applyNonwovenFilament} from './profession-nonwoven-filament.mjs'
import {applyNonwovenTechnician} from './profession-nonwoven-technician.mjs'
import {applyWeftPreparation} from './profession-weft-preparation.mjs'
import {applyTextileSketches} from './profession-textile-sketches.mjs'
import {applyWeavingMachines} from './profession-weaving-machines.mjs'
import {applyWeavingTechnician} from './profession-weaving-technician.mjs'
import { professionTargets } from './profession-targets.mjs'
import { applyProfessionFoundations } from './profession-foundations.mjs'
import { applyLeatherKnowledge } from './profession-leather.mjs'
import { applyLeatherManual } from './profession-leather-manual.mjs'
import { applyLeatherCutting } from './profession-leather-cutting.mjs'
import { applyDigitalTools } from './profession-digital.mjs'
import { applyTechnicalDrawing } from './profession-drawing.mjs'
import { applyLeatherCad } from './profession-leather-cad.mjs'
import { applyVisitorService } from './profession-service.mjs'
import { applyCustodySkills } from './profession-custody.mjs'
import { applyCloakRoom } from './profession-cloak-room.mjs'
import { applyDistributionSkills } from './profession-distribution.mjs'
import { applyLeafletDistributor } from './profession-leaflet.mjs'
import { applyCleaningSkills } from './profession-cleaning.mjs'
import { applyLockerRoom } from './profession-locker-room.mjs'
import { applyFoodHygiene } from './profession-food-hygiene.mjs'
import { applyHotelServices } from './profession-hotel-services.mjs'
import { applyHotelPorter } from './profession-hotel-porter.mjs'
import { applyGuestRelations } from './profession-guest-relations.mjs'
import { applyBooking } from './profession-booking.mjs'
import { applyHotelConcierge } from './profession-hotel-concierge.mjs'
import { applyCash } from './profession-cash.mjs'
import { applyVenueSkills } from './profession-venue.mjs'
import { applyUsher } from './profession-usher.mjs'
import { applyWorkshop } from './profession-workshop.mjs'
import { applyFinishing } from './profession-finishing.mjs'
import { applyLeatherFinishing } from './profession-leather-finishing.mjs'
import { applyMachineCutting } from './profession-machine-cutting.mjs'
import { applyPatternMachinery } from './profession-pattern-machinery.mjs'
import { applyLeatherPatternmaker } from './profession-leather-patternmaker.mjs'
import { applyErrands } from './profession-errands.mjs'
import { applyHotelButler } from './profession-hotel-butler.mjs'
import { applyCoordination } from './profession-coordination.mjs'
import { applyWarehouse } from './profession-warehouse.mjs'
import { applyProductionPlanning } from './profession-production-planning.mjs'
import { applyLeatherWarehouse } from './profession-leather-warehouse.mjs'
import { applyPackagingEquipment } from './profession-packaging-equipment.mjs'
import { applyPacking } from './profession-packing.mjs'
import { applyWarehouseOperations } from './profession-warehouse-operations.mjs'
import { applyLeatherPacking } from './profession-leather-packing.mjs'
import { applyWorkInstructions } from './profession-work-instructions.mjs'
import { applyPackagingKnowledge } from './profession-packaging-knowledge.mjs'
import { applyLabelsHandling } from './profession-labels-handling.mjs'
import { applyHandPacker } from './profession-hand-packer.mjs'
import { applyTechnicalCommunication } from './profession-technical-communication.mjs'
import { applyQualityControl } from './profession-quality-control.mjs'
import { applyQualitySystems } from './profession-quality-systems.mjs'
import { applyLeatherQualityController } from './profession-leather-quality-controller.mjs'
import { applyMeasurementData } from './profession-measurement-data.mjs'
import { applyEnvironmentalManufacturing } from './profession-environmental-manufacturing.mjs'
import { applyLaboratoryTesting } from './profession-laboratory-testing.mjs'
import { applyLeatherLaboratory } from './profession-leather-laboratory.mjs'
import { applyFootwearMaterials } from './profession-footwear-materials.mjs'
import { applyFootwearTechnology } from './profession-footwear-technology.mjs'
import { applyFootwearQuality } from './profession-footwear-quality.mjs'
import { applyManufacturingTeams } from './profession-manufacturing-teams.mjs'
import { applyQualityData } from './profession-quality-data.mjs'
import { applyFootwearFinishingPacking } from './profession-footwear-finishing-packing.mjs'
import { applyFootwearQualityController } from './profession-footwear-quality-controller.mjs'
import { applyProblemSolving } from './profession-problem-solving.mjs'
import { applyQualityEvaluation } from './profession-quality-evaluation.mjs'
import { applyAuditParticipation } from './profession-audit-participation.mjs'
import { applyFootwearLaboratoryMethods } from './profession-footwear-laboratory-methods.mjs'
import { applyFootwearLaboratory } from './profession-footwear-laboratory.mjs'
import { applyMaterialResponse } from './profession-material-response.mjs'
import { applyFootwearTypes } from './profession-footwear-types.mjs'
import { applyLeatherQualityTechnician } from './profession-leather-quality-technician.mjs'
import { applyFootwearQualityTechnician } from './profession-footwear-quality-technician.mjs'
import { applyPrestitchKnowledge } from './profession-prestitch-knowledge.mjs'
import { applyPrestitchMethods } from './profession-prestitch-methods.mjs'
import { applyStitching } from './profession-stitching.mjs'
import { applyFootwearSeams } from './profession-footwear-seams.mjs'
import { applyStitchingOperators } from './profession-stitching-operators.mjs'
import { applyHandSewing } from './profession-hand-sewing.mjs'
import { applyLeatherRepair } from './profession-leather-repair.mjs'
import { applyApparelSewing } from './profession-apparel-sewing.mjs'
import { applyHandStitchers } from './profession-hand-stitchers.mjs'
import { applyLastTypes } from './profession-last-types.mjs'
import { applyPatternGrading } from './profession-pattern-grading.mjs'
import { applyFootwearPatterns } from './profession-footwear-patterns.mjs'
import { applyFootwearCad } from './profession-footwear-cad.mjs'
import { applyFootwearPatternmakers } from './profession-footwear-patternmakers.mjs'
import { applyMaintenanceKnowledge } from './profession-machine-maintenance-knowledge.mjs'
import { applyEquipmentMaintenance } from './profession-equipment-maintenance.mjs'
import { applyMachineMonitoring } from './profession-machine-monitoring.mjs'
import { applyFootwearWarehouseSkills } from './profession-footwear-warehouse-skills.mjs'
import { applyLeatherMaintenance } from './profession-leather-maintenance.mjs'
import { applyFootwearWarehouse } from './profession-footwear-warehouse.mjs'
import { applyManufacturingMethods } from './profession-manufacturing-methods.mjs'
import { applyWorkMeasurement } from './profession-work-measurement.mjs'
import { applyLeatherManufacturePlanning } from './profession-leather-manufacture-planning.mjs'
import { applyProductionProductivity } from './profession-production-productivity.mjs'
import { applyFootwearDesignKnowledge } from './profession-footwear-design-knowledge.mjs'
import { applyOperationProcedures } from './profession-operation-procedures.mjs'
import { applyFootwearSamples } from './profession-footwear-samples.mjs'
import { applyLeatherIndustrialEngineer } from './profession-leather-industrial-engineer.mjs'
import { applyFootwearProductionOperator } from './profession-footwear-production-operator.mjs'
import { professionSource } from './profession-authoring.mjs'
import { reconcileAuthoredRoutes } from './reconcile-authored-routes.mjs'
import { auditExploration } from '../src/foundation-model.js'
import { auditProfessions } from '../src/profession-audit.js'

export function buildProfessionRoute(dataset, authored) {
  const role=dataset.roles.find(node=>node.id===authored.role_id)
  const records=new Map(['roles','capabilities','learning_units'].flatMap(key=>dataset[key]||[]).map(node=>[node.id,node]))
  const children=new Map(),prior=new Map()
  for(const edge of dataset.decompositions){
    if(edge.completion_requirement==='optional'||edge.completionRequirement==='optional')continue
    const map=edge.type==='decomposes_into'?children:edge.type==='prerequisite_for'?prior:null
    if(!map)continue
    const from=edge.type==='prerequisite_for'?edge.to:edge.from,to=edge.type==='prerequisite_for'?edge.from:edge.to
    if(!map.has(from))map.set(from,new Set());map.get(from).add(to)
  }
  const starts=new Set(dataset.starting_foundations.entries.map(entry=>entry.id))
  const essentials=dataset.role_capability_assertions.filter(edge=>edge.from===role.id&&(edge.relationType||edge.escoType||edge.type)==='esco_essential').map(edge=>edge.to)
  const steps=new Map()
  function visit(id){
    if(steps.has(id))return
    const node=records.get(id)
    if(!node)throw new Error('Missing profession record: '+id)
    const requires=starts.has(id)?[]:[...new Set([...(children.get(id)||[]),...(prior.get(id)||[]),...(authored.demonstrations[id]?[authored.demonstrations[id]]:[])])]
    const step={id,stage:starts.has(id)?'early':node.source?.includes('foundation')||id.includes('foundation')||id.includes(':development:')?'shared':'work',mode:node.kind==='learning_unit'?'activity':'gate',requires}
    steps.set(id,step);for(const input of requires)visit(input)
  }
  steps.set(role.id,{id:role.id,stage:'work',mode:'gate',requires:[...essentials,...authored.occupation_outcomes]})
  for(const input of steps.get(role.id).requires)visit(input)
  return {format:1,id:'atlas:profession:'+role.id.split('/').at(-1)+':v1',version:1,label:role.label+' - authored pathway',
    occupation_id:role.id,end_ids:[role.id],entry_ids:[...steps.values()].filter(step=>!step.requires.length).map(step=>step.id),steps:[...steps.values()],
    status:'Individually authored, unreviewed occupational pathway proposal',authoring_basis:'individually_authored',source_definition:role.definition,
    scope:'All essential ESCO requirements plus the occupational work outcomes mapped from the source description. Model, supported practice and actual supervised workpiece evidence are explicitly distinguished.',
    semantics:'Every listed input is required (AND). Declared starting conditions bound this authored model. Gates aggregate input evidence and cannot bypass learning activities. Authoring completeness is not a learner assessment.',
    access:'Use accessible representations, communication and agreed physical support. Record the person\'s contribution and partner/instructor support; supported completion is not independent work competence.',
    stages:[{id:'early',label:'1. Documented supported starts',description:'Explicit starting assumptions; no universal age or zero-ability claim.'},{id:'shared',label:'2. Shared foundations',description:'Focused concepts with concrete tasks and changed-case checks.'},{id:'work',label:'3. Occupational knowledge and work',description:'Domain concepts, contextual transfer and actual supervised work outcomes.'}],
    review_needed:['Review prerequisite and concept-size hypotheses with learning/accessibility practitioners.','Review actual procedures, domain breadth and occupational assessments with a relevant practitioner.','Observe learners and calibrate effort/support; no such observations are currently claimed.'],
    ...authored}
}

const dataset=await readDataset()
// Rebuild this generator's edges in one deterministic order. All official and
// other Atlas relations, including the explicit input revisions, are retained.
dataset.decompositions=dataset.decompositions.filter(edge=>edge.source!==professionSource)
applyProfessionFoundations(dataset)
const knowledge=applyLeatherKnowledge(dataset)
const authored=applyLeatherManual(dataset,knowledge)
const cutting=applyLeatherCutting(dataset,knowledge)
const digital=applyDigitalTools(dataset)
const drawing=applyTechnicalDrawing(dataset)
const cad=applyLeatherCad(dataset,knowledge,digital,drawing)
const service=applyVisitorService(dataset)
const custody=applyCustodySkills(dataset)
const cloak=applyCloakRoom(dataset,[...service,...custody])
const distribution=applyDistributionSkills(dataset)
const leaflet=applyLeafletDistributor(dataset,distribution)
const cleaning=applyCleaningSkills(dataset)
const locker=applyLockerRoom(dataset,[...service.filter(mapping=>['communication','service'].includes(mapping.key)),...custody.filter(mapping=>mapping.key==='lost'),...cleaning])
const food=applyFoodHygiene(dataset)
const hotel=applyHotelServices(dataset)
const porter=applyHotelPorter(dataset,[...service.filter(mapping=>['welcome','service'].includes(mapping.key)),...hotel,food])
const guest=applyGuestRelations(dataset)
applyBooking(dataset)
const concierge=applyHotelConcierge(dataset,[...guest,...service.filter(mapping=>['welcome','service'].includes(mapping.key)),...hotel.filter(mapping=>mapping.key==='support'),food])
applyCash(dataset)
const venue=applyVenueSkills(dataset)
const usher=applyUsher(dataset,[...venue,...service])
const maintenance=applyWorkshop(dataset)
const finishing=applyFinishing(dataset,knowledge)
const leatherFinishing=applyLeatherFinishing(dataset,knowledge,maintenance,finishing)
const machineCutting=applyMachineCutting(dataset,knowledge)
const patternMachinery=applyPatternMachinery(dataset)
const patternmaker=applyLeatherPatternmaker(dataset,knowledge,drawing,machineCutting,patternMachinery)
const errands=applyErrands(dataset)
applyCoordination(dataset)
const butler=applyHotelButler(dataset,[...venue.filter(mapping=>mapping.key==='features'),food,...guest.filter(mapping=>['relationship','complaints','checkin','needs'].includes(mapping.key)),...service.filter(mapping=>['welcome','service'].includes(mapping.key)),errands,...hotel.filter(mapping=>mapping.key==='luggage')])
const warehouse=applyWarehouse(dataset)
const production=applyProductionPlanning(dataset)
const leatherWarehouse=applyLeatherWarehouse(dataset,knowledge,digital,warehouse,production)
const packEquipment=applyPackagingEquipment(dataset)
const packing=applyPacking(dataset,knowledge)
const warehouseOperations=applyWarehouseOperations(dataset)
const leatherPacking=applyLeatherPacking(dataset,knowledge,packing.filter(mapping=>['packgoods','packleather','footleatherpacking'].includes(mapping.key)),packEquipment.find(mapping=>mapping.key==='packequipment'),warehouseOperations,warehouse.find(mapping=>mapping.key==='layout'))
const workInstructions=applyWorkInstructions(dataset)
const packagingKnowledge=applyPackagingKnowledge(dataset)
const labelsHandling=applyLabelsHandling(dataset)
const handPacker=applyHandPacker(dataset,[...workInstructions,...packagingKnowledge,...labelsHandling,...packing.filter(mapping=>['packgoods','stackgoods'].includes(mapping.key)),...packEquipment])
const technicalCommunication=applyTechnicalCommunication(dataset)
const qualityControl=applyQualityControl(dataset,knowledge)
const qualitySystems=applyQualitySystems(dataset)
const leatherQualityController=applyLeatherQualityController(dataset,knowledge,digital,qualityControl,technicalCommunication,qualitySystems)
applyMeasurementData(dataset)
const environment=applyEnvironmentalManufacturing(dataset)
const laboratory=applyLaboratoryTesting(dataset,knowledge)
const leatherLaboratory=applyLeatherLaboratory(dataset,knowledge,digital,qualityControl.find(mapping=>mapping.key==='qualitycontrol'),technicalCommunication.find(mapping=>mapping.key==='foreigncommercial'),qualitySystems,laboratory,environment)
const footwearMaterials=applyFootwearMaterials(dataset,knowledge)
const footwearTechnology=applyFootwearTechnology(dataset,knowledge)
const footwearQuality=applyFootwearQuality(dataset,knowledge)
const footwearKnowledge=[...footwearMaterials,...footwearTechnology,footwearQuality]
const manufacturingTeams=applyManufacturingTeams(dataset)
applyQualityData(dataset)
const footwearFinishingPacking=applyFootwearFinishingPacking(dataset,footwearKnowledge,qualityControl.find(mapping=>mapping.key==='finishingknowledge'),maintenance,packing.find(mapping=>mapping.key==='footleatherpacking'),qualityControl.find(mapping=>mapping.key==='qualitycontrol'),finishing.find(mapping=>mapping.key==='footwearfinishing'))
const footwearQualityController=applyFootwearQualityController(dataset,footwearKnowledge.filter(mapping=>!['footequipment','footmachinery'].includes(mapping.key)),manufacturingTeams,qualitySystems,technicalCommunication,digital,qualityControl.find(mapping=>mapping.key==='qualitycontrol'))
const problemSolving=applyProblemSolving(dataset)
const qualityEvaluation=applyQualityEvaluation(dataset)
applyAuditParticipation(dataset)
applyMaterialResponse(dataset)
applyFootwearLaboratoryMethods(dataset)
const footwearLaboratory=applyFootwearLaboratory(dataset,footwearKnowledge.filter(mapping=>!['footequipment','footmachinery'].includes(mapping.key)),manufacturingTeams,qualityControl.find(mapping=>mapping.key==='qualitycontrol'),laboratory,problemSolving,qualityEvaluation)
const footwearTypes=applyFootwearTypes(dataset)
const leatherQualityTechnician=applyLeatherQualityTechnician(dataset,knowledge,qualityControl.find(mapping=>mapping.key==='finishingknowledge'),qualityControl.find(mapping=>mapping.key==='qualitycontrol'),environment,technicalCommunication,qualitySystems,digital)
const footwearQualityTechnician=applyFootwearQualityTechnician(dataset,footwearKnowledge.filter(mapping=>!['footequipment','footmachinery'].includes(mapping.key)),footwearTypes,qualityControl.find(mapping=>mapping.key==='finishingknowledge'),qualityControl.find(mapping=>mapping.key==='qualitycontrol'),environment,technicalCommunication,manufacturingTeams,qualitySystems,digital,problemSolving)
const prestitchKnowledge=applyPrestitchKnowledge(dataset,knowledge)
const prestitch=applyPrestitchMethods(dataset)
const stitching=applyStitching(dataset,knowledge)
const footwearSeams=applyFootwearSeams(dataset)
const stitchingOperators=applyStitchingOperators(dataset,knowledge,footwearKnowledge,maintenance,machineCutting,prestitchKnowledge,prestitch,stitching,footwearSeams)
const manualSewing=applyHandSewing(dataset)
const leatherRepair=applyLeatherRepair(dataset,knowledge)
const apparelSewing=applyApparelSewing(dataset)
const handStitchers=applyHandStitchers(dataset,knowledge,footwearKnowledge,prestitchKnowledge,prestitch,stitching,footwearSeams,manualSewing,leatherRepair,apparelSewing,manufacturingTeams)
const lastTypes=applyLastTypes(dataset)
const patternGrading=applyPatternGrading(dataset)
const footwearPatterns=applyFootwearPatterns(dataset)
const footwearCad=applyFootwearCad(dataset)
const footwearPatternmakers=applyFootwearPatternmakers(dataset,footwearKnowledge,footwearTypes,drawing,manufacturingTeams,patternMachinery,digital,footwearPatterns,patternGrading,footwearCad,lastTypes)
const maintenanceKnowledge=applyMaintenanceKnowledge(dataset)
const equipmentMaintenance=applyEquipmentMaintenance(dataset)
const machineMonitoring=applyMachineMonitoring(dataset,knowledge)
const footwearWarehouseSkills=applyFootwearWarehouseSkills(dataset)
const leatherMaintenance=applyLeatherMaintenance(dataset,knowledge,environment,technicalCommunication,digital,maintenanceKnowledge,equipmentMaintenance,machineMonitoring)
const footwearWarehouse=applyFootwearWarehouse(dataset,footwearKnowledge,footwearWarehouseSkills,equipmentMaintenance,packing.find(mapping=>mapping.key==='footleatherpacking'),warehouseOperations,digital)
const manufacturingMethods=applyManufacturingMethods(dataset)
const workMeasurement=applyWorkMeasurement(dataset)
const leatherManufacturePlan=applyLeatherManufacturePlanning(dataset,knowledge)
const productionProductivity=applyProductionProductivity(dataset)
const footwearDesign=applyFootwearDesignKnowledge(dataset)
const operationProcedures=applyOperationProcedures(dataset)
const footwearSamples=applyFootwearSamples(dataset)
const leatherIndustrialEngineer=applyLeatherIndustrialEngineer(dataset,knowledge,environment,technicalCommunication,digital,manufacturingMethods,workMeasurement,leatherManufacturePlan,productionProductivity)
const footwearProductionOperator=applyFootwearProductionOperator(dataset,footwearKnowledge,manufacturingTeams,footwearSamples,operationProcedures,footwearDesign)
const cleaningSafety=applyCleaningSafetyKnowledge(dataset)
const cleaningControls=applyCleaningControls(dataset)
const linenServices=applyLinenServices(dataset)
const furnitureFoundations=applyFurnitureFoundations(dataset)
const roomCleaning=applyRoomCleaning(dataset)
const furnitureMethods=applyFurnitureMethods(dataset)
const toiletServices=applyToiletServices(dataset)
const linenRoomAttendant=applyLinenRoomAttendant(dataset,[...linenServices,food])
const roomAttendant=applyRoomAttendant(dataset,[...roomCleaning.filter(m=>['roomcleaning','cleaningduties'].includes(m.key)),...linenServices.filter(m=>m.key==='linenoperation'),...cleaningControls.filter(m=>['companycompliance','cleaningchemicals'].includes(m.key)),...cleaningSafety.filter(m=>m.key==='sectorregulations'),...service.filter(m=>m.key==='service'),...guest.filter(m=>m.key==='complaints'),food])
const toiletAttendant=applyToiletAttendant(dataset,[...linenServices.filter(m=>m.key==='cleaningsupplies'),...cleaningControls.filter(m=>m.key==='cleaningprevention'),...toiletServices,...roomCleaning.filter(m=>['cleaningduties','routinewaste','glasscleaning'].includes(m.key)),...cleaningSafety.filter(m=>m.key==='ppeknowledge'),...service.filter(m=>m.key==='service'),...cleaning.filter(m=>m.key==='equipment')])
const specialistCleaning=applySpecialistCleaningFoundations(dataset)
const cleaningCareServices=applyCleaningCareServices(dataset)
const textileCareKnowledge=applyTextileCareKnowledge(dataset)
const textileCleaningMethods=applyTextileCleaningMethods(dataset)
const kitchenSupport=applyKitchenSupport(dataset)
const trainCleaning=applyTrainCleaning(dataset)
const kitchenPorter=applyKitchenPorter(dataset,[...kitchenSupport,...specialistCleaning.filter(m=>['coshh','workenvironment','hazardreport','disinfectsurfaces'].includes(m.key)),...cleaningControls.filter(m=>m.key==='cleaningchemicals'),food])
const trainCleaner=applyTrainCleaner(dataset,[...trainCleaning,...specialistCleaning.filter(m=>['cleanequipment','publicareas','techniques','shifts'].includes(m.key)),...roomCleaning.filter(m=>['glasscleaning','cleaningduties','routinewaste'].includes(m.key)),...cleaning.filter(m=>['equipment','protocol'].includes(m.key)),...linenServices.filter(m=>m.key==='cleaningsupplies'),...cleaningSafety.filter(m=>m.key==='ppeknowledge')])
const furnitureCleaner=applyFurnitureCleaner(dataset,[...furnitureFoundations,...furnitureMethods,...cleaningControls.filter(m=>['cleaningprevention','cleaningchemicals'].includes(m.key)),...roomCleaning.filter(m=>m.key==='cleaningduties'),...cleaning.filter(m=>m.key==='protocol'),...service.filter(m=>m.key==='service')])
const draperyCarpetCleaner=applyDraperyCarpetCleaner(dataset,[...textileCareKnowledge,...cleaningCareServices,...textileCleaningMethods,...trainCleaning.filter(m=>m.key==='floormachines'),...cleaningControls.filter(m=>m.key==='cleaningchemicals'),...service.filter(m=>m.key==='service'),...cleaning.filter(m=>m.key==='equipment'),...specialistCleaning.filter(m=>['workenvironment','techniques'].includes(m.key))])
const windowRiskAccess=applyWindowRiskAccess(dataset)
const cleaningReportingWaste=applyCleaningReportingWaste(dataset)
const windowMethods=applyWindowMethods(dataset)
const windowCleaner=applyWindowCleaner(dataset,[...windowRiskAccess,...cleaningReportingWaste,...windowMethods,...cleaningControls.filter(m=>['cleaningprevention','cleaningchemicals'].includes(m.key)),...cleaningCareServices.filter(m=>m.key==='personalhygiene'),...cleaningSafety.filter(m=>m.key==='ppeknowledge'),...toiletServices.filter(m=>m.key==='activityreports'),...roomCleaning.filter(m=>m.key==='glasscleaning'),...cleaning.filter(m=>['protocol','equipment'].includes(m.key)),...linenServices.filter(m=>m.key==='cleaningsupplies'),...specialistCleaning.filter(m=>m.key==='coshh')])
const vehicleKnowledge=applyVehicleKnowledge(dataset)
const vehicleWorkControls=applyVehicleWorkControls(dataset)
const vehicleSurfaces=applyVehicleSurfaces(dataset)
const vehicleSpecialCare=applyVehicleSpecialCare(dataset)
const vehicleCleaner=applyVehicleCleaner(dataset,[...vehicleKnowledge,...vehicleWorkControls,...vehicleSurfaces,...vehicleSpecialCare,...specialistCleaning.filter(m=>['coshh','cleanequipment'].includes(m.key)),...cleaningControls.filter(m=>m.key==='cleaningchemicals')])
const buildingSite=applyBuildingSiteControls(dataset)
const buildingAssessment=applyBuildingAssessment(dataset)
const buildingExteriorMethods=applyBuildingExteriorMethods(dataset)
const buildingExteriorCleaner=applyBuildingExteriorCleaner(dataset,[...buildingSite,...buildingAssessment,...buildingExteriorMethods,...cleaningControls.filter(m=>m.key==='cleaningprevention'),...cleaning.filter(m=>m.key==='floors'),...specialistCleaning.filter(m=>m.key==='techniques')])
const caretakerGovernance=applyCaretakerGovernance(dataset)
const buildingManagement=applyBuildingManagement(dataset)
applyCaretakerMaintenance(dataset)
const buildingCaretaker=applyBuildingCaretaker(dataset,[...caretakerGovernance,...buildingManagement,...guest.filter(m=>m.key==='complaints')])
const telephonyFoundations=applyTelephonyFoundations(dataset)
const telephonyConnections=applyTelephonyConnections(dataset)
const telephonyMaintenance=applyTelephonyMaintenance(dataset)
const switchboardOperator=applySwitchboardOperator(dataset,[...telephonyFoundations,...telephonyConnections,...telephonyMaintenance])
const officeSuite=applyOfficeSuite(dataset)
const officeCommunications=applyOfficeCommunications(dataset)
const officeGovernance=applyOfficeGovernance(dataset)
const receptionOperations=applyReceptionOperations(dataset)
const receptionist=applyReceptionist(dataset,[...officeSuite,...officeCommunications,...officeGovernance,...receptionOperations,...telephonyFoundations.filter(m=>m.key==='telephonecommunication'),...service.filter(m=>['communication','welcome'].includes(m.key))])
const dataKnowledge=applyDataKnowledge(dataset)
const rdfQueryKnowledge=applyRdfQueryKnowledge(dataset)
const dataAnalysis=applyDataAnalysis(dataset)
const dataSecurity=applyDataSecurity(dataset)
const dataEntryMethods=applyDataEntryMethods(dataset)
applyOfficeEquipment(dataset)
const wordProcessing=applyWordProcessing(dataset)
const dataEntryClerk=applyDataEntryClerk(dataset,[...dataKnowledge,...rdfQueryKnowledge,...dataAnalysis,...dataSecurity,...dataEntryMethods,...wordProcessing])
applyOfficeFoundations(dataset)
const statutoryRecords=applyStatutoryRecords(dataset)
applyCommunicationFoundations(dataset)
const corporateInformation=applyCorporateInformation(dataset)
const officeDocuments=applyOfficeDocuments(dataset)
const officeRecords=applyOfficeRecords(dataset)
const officeAnalysis=applyOfficeAnalysis(dataset)
const officeSystems=applyOfficeSystems(dataset)
const officeMail=applyOfficeMail(dataset)
const officeOperations=applyOfficeOperations(dataset)
const administrativeAssistant=applyAdministrativeAssistant(dataset,[statutoryRecords,corporateInformation,...officeSuite,...officeCommunications,...officeGovernance,...officeDocuments,...officeRecords,...officeAnalysis,...officeSystems,...officeMail,...officeOperations])
const customerRecords=applyCustomerRecords(dataset)
const workLiaison=applyWorkLiaison(dataset)
const postalOperations=applyPostalOperations(dataset)
const mailClerk=applyMailClerk(dataset,[...customerRecords,...workLiaison,...postalOperations,...officeMail,...dataSecurity,...officeRecords])
const geographicWork=applyGeographicWork(dataset)
const responsibleWork=applyResponsibleWork(dataset)
const dataProtectionKnowledge=applyDataProtectionKnowledge(dataset)
const roadUse=applyRoadUse(dataset)
const postman=applyPostman(dataset,[...geographicWork,...responsibleWork,...dataProtectionKnowledge,...roadUse,...officeMail,...customerRecords,...postalOperations,...workLiaison,...distribution,...vehicleWorkControls])
const foodShelfLife=applyFoodShelfLife(dataset)
const retailStock=applyRetailStock(dataset)
const retailMerchandise=applyRetailMerchandise(dataset)
const shelfFiller=applyShelfFiller(dataset,[food,...foodShelfLife,...retailStock,...retailMerchandise])
const workErgonomics=applyWorkErgonomics(dataset)
const domesticMethods=applyDomesticMethods(dataset)
const domesticCleaner=applyDomesticCleaner(dataset,[...cleaningControls,...cleaningCareServices,...roomCleaning,...specialistCleaning,...linenServices,...toiletServices,...cleaning,...kitchenSupport,...workErgonomics,...domesticMethods])
const bookkeepingKnowledge=applyBookkeepingKnowledge(dataset)
const salesOffice=applySalesOffice(dataset)
const salesSupportAssistant=applySalesSupportAssistant(dataset,[...bookkeepingKnowledge,...salesOffice,...officeOperations,...officeAnalysis,...officeMail])
const managerSupport=applyManagerSupport(dataset)
const officeSoftwareKnowledge=applyOfficeSoftwareKnowledge(dataset)
const supplyChainKnowledge=applySupplyChainKnowledge(dataset)
const financialNeeds=applyFinancialNeeds(dataset)
const supplyChainAssistant=applySupplyChainAssistant(dataset,[...managerSupport,...officeSoftwareKnowledge,...supplyChainKnowledge,...financialNeeds,...officeAnalysis,...officeDocuments,...officeSystems,...officeOperations])
const accountManagement=applyAccountManagement(dataset)
const fundraising=applyFundraising(dataset)
const fundraisingAssistant=applyFundraisingAssistant(dataset,[...accountManagement,...fundraising,...managerSupport,...officeAnalysis,...officeOperations,...salesOffice])
const promotionKnowledge=applyPromotionKnowledge(dataset)
const promotionMethods=applyPromotionMethods(dataset)
const promotionAssistant=applyPromotionAssistant(dataset,[...promotionKnowledge,...promotionMethods,...managerSupport,...officeAnalysis,...officeOperations,...salesOffice])
const dignityCare=applyDignityCare(dataset)
const funeralMethods=applyFuneralMethods(dataset)
const funeralAttendant=applyFuneralAttendant(dataset,[...dignityCare,...funeralMethods,...service,...venue])
const mathematics=applyMathematics(dataset)
const engineeringMethods=applyEngineeringMethods(dataset)
const researchAssistance=applyResearchAssistance(dataset)
const engineeringAssistant=applyEngineeringAssistant(dataset,[...mathematics,...engineeringMethods,...researchAssistance,...officeDocuments,...officeMail,...officeOperations,...salesOffice])
const staffManagement=applyStaffManagement(dataset)
const manufacturingCoordination=applyManufacturingCoordination(dataset)
const clothingControl=applyClothingControl(dataset)
const clothingOperationsManager=applyClothingOperationsManager(dataset,[...staffManagement,...manufacturingCoordination,...clothingControl,drawing])
const textileMaterials=applyTextileMaterials(dataset)
const workStandards=applyWorkStandards(dataset)
const textileProcess=applyTextileProcess(dataset)
const textileOperationsManager=applyTextileOperationsManager(dataset,[...textileMaterials,...workStandards,...textileProcess,...manufacturingCoordination])
const yarnMeasurement=applyYarnMeasurement(dataset)
const apparelInspection=applyApparelInspection(dataset)
const textileLineQuality=applyTextileLineQuality(dataset)
const textileQualityManager=applyTextileQualityManager(dataset,[...yarnMeasurement,...apparelInspection,...textileLineQuality,...textileProcess,...workStandards,...qualityEvaluation])
const nonwovenKnowledge=applyNonwovenKnowledge(dataset)
const technicalTextileSpecifications=applyTechnicalTextileSpecifications(dataset)
const nonwovenFilament=applyNonwovenFilament(dataset)
const nonwovenTechnician=applyNonwovenTechnician(dataset,[...nonwovenKnowledge,...technicalTextileSpecifications,...nonwovenFilament,...textileMaterials,...yarnMeasurement,...workStandards,...textileProcess])
const weftPreparation=applyWeftPreparation(dataset)
const textileSketches=applyTextileSketches(dataset)
const weavingMachines=applyWeavingMachines(dataset)
const weavingTechnician=applyWeavingTechnician(dataset,[...weftPreparation,...textileSketches,...weavingMachines,...textileMaterials,...technicalTextileSpecifications,...yarnMeasurement,...workStandards])
const authoredRoutes=[authored,cutting,cad,cloak,leaflet,locker,porter,concierge,usher,leatherFinishing,patternmaker,butler,leatherWarehouse,leatherPacking,handPacker,leatherQualityController,leatherLaboratory,footwearFinishingPacking,footwearQualityController,footwearLaboratory,leatherQualityTechnician,footwearQualityTechnician,...stitchingOperators,...handStitchers,...footwearPatternmakers,leatherMaintenance,footwearWarehouse,leatherIndustrialEngineer,footwearProductionOperator,linenRoomAttendant,roomAttendant,toiletAttendant,kitchenPorter,trainCleaner,furnitureCleaner,draperyCarpetCleaner,windowCleaner,vehicleCleaner,buildingExteriorCleaner,buildingCaretaker,switchboardOperator,receptionist,dataEntryClerk,administrativeAssistant,mailClerk,postman,shelfFiller,domesticCleaner,salesSupportAssistant,supplyChainAssistant,fundraisingAssistant,promotionAssistant,funeralAttendant,engineeringAssistant,clothingOperationsManager,textileOperationsManager,textileQualityManager,nonwovenTechnician,weavingTechnician]
reconcileAuthoredRoutes(dataset)
const routes=authoredRoutes.map(authored=>buildProfessionRoute(dataset,authored))
dataset.profession_pathways={format:1,target:100,targets:professionTargets(dataset),routes,
  interpretation:'A target inventory is not coverage. Count only individually authored routes passing the strict profession audit; do not count generated scaffolds, schema-only completeness or graph connectivity as worked-out professions.'}
const report=auditProfessions(dataset)
const comparisonAudit=auditExploration(dataset)
if(!comparisonAudit.valid)throw new Error(comparisonAudit.errors.join('\n'))
if(report.errors.length)throw new Error(report.errors.join('\n'))
for(const authored of authoredRoutes){const row=report.rows.find(row=>row.id===authored.role_id);if(!row.complete)throw new Error(row.label+'\n'+JSON.stringify(row.blockers,null,2))}
await writeDataset(dataset)
console.log(JSON.stringify({target:report.target,complete:report.complete,authored:report.authored,professions:report.rows.filter(row=>row.complete).map(row=>({label:row.label,activities:row.activities}))}))
