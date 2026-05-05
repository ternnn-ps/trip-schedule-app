package com.app.test.beans.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class TripRequest {

    private String id;
    private String name;
    private String destination;
    private String dateRange;
    private String notes;
    private String hostUserName;
    private Boolean allUsers;
    private List<String> users;
    private List<String> pendingUsers;
    private List<TripPlanRequest> plans;
}
