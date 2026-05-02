package com.app.test.beans.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class TripResponse {

    private String id;
    private String name;
    private String destination;
    private String dateRange;
    private String notes;
    private List<String> users;
    private List<TripPlanResponse> plans;
}
