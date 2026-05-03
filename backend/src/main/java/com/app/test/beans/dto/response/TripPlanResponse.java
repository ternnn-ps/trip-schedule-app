package com.app.test.beans.dto.response;

import lombok.Data;

@Data
public class TripPlanResponse {

    private String id;
    private String day;
    private String time;
    private String detail;
    private String place;
    private String latitude;
    private String longitude;
    private String googleMapUrl;
}
