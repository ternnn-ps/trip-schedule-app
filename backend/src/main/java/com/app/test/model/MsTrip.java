package com.app.test.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Setter
@Getter
@Entity
@Table(name = "MS_TRIP")
public class MsTrip {

    @Id
    private String id;

    private String name;
    private String destination;
    private String dateRange;

    @Column(length = 2000)
    private String notes;

    private String hostUserName;

    private Boolean allUsers = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "MS_TRIP_USER", joinColumns = @JoinColumn(name = "trip_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "user_name")
    private List<String> users = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "MS_TRIP_PENDING_USER", joinColumns = @JoinColumn(name = "trip_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "user_name")
    private List<String> pendingUsers = new ArrayList<>();

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("createdDate ASC")
    private List<MsTripPlan> plans = new ArrayList<>();

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;
}
