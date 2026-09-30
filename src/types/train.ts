export interface TrainMasterItem {
  trainNumber: string;
  trainName: string;
  fullString: string;
}

export interface NormalizedTrainMasterItem extends TrainMasterItem {
  normalizedNumber: string;
  normalizedName: string;
}
