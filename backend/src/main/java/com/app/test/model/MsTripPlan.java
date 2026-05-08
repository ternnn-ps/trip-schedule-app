package com.app.test.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.Date;

@Setter
@Getter
@Entity
@Table(name = "MS_TRIP_PLAN")
public class MsTripPlan {

    @Id
    private String id;

    @Column(name = "plan_day")
    private String day;

    @Column(name = "plan_time")
    private String time;

    @Column(length = 2000)
    private String detail;

    private String place;
    private String latitude;
    private String longitude;
    @Column(name = "google_map_url", length = 1000)
    private String googleMapUrl;
    private Boolean completed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private MsTrip trip;

    private Date createdDate;
    private Date updatedDate;

    private Character recordStatus;
}
